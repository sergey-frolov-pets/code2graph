<script setup>
import { computed, ref } from "vue";
import { api, readToken, writeToken } from "./api.js";

const token = ref(readToken());
const username = ref("");
const password = ref("");
const error = ref("");
const tab = ref("subscriptions");
const subscriptions = ref([]);
const campaigns = ref([]);
const stats = ref(null);
const grantUserId = ref("");
const grantPackage = ref("cloud");
const grantDays = ref(30);
const campaignTitle = ref("");
const campaignDays = ref(14);
const campaignTokens = ref(50);

const signedIn = computed(() => token.value.length > 0);

async function login() {
  error.value = "";
  const payload = await api("/api/auth/operator-login", {
    method: "POST",
    body: JSON.stringify({ username: username.value, password: password.value }),
  });
  writeToken(payload.token);
  token.value = payload.token;
  password.value = "";
  await refresh();
}

function logout() {
  writeToken("");
  token.value = "";
  subscriptions.value = [];
  campaigns.value = [];
  stats.value = null;
}

async function refresh() {
  error.value = "";
  try {
    if (tab.value === "subscriptions") {
      const payload = await api("/api/billing-admin/subscriptions");
      subscriptions.value = payload.subscriptions;
    } else if (tab.value === "campaigns") {
      const payload = await api("/api/billing-admin/campaigns");
      campaigns.value = payload.campaigns;
    } else {
      stats.value = await api("/api/billing-admin/stats?days=30");
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Ошибка";
  }
}

async function grant() {
  error.value = "";
  await api("/api/billing-admin/grants", {
    method: "POST",
    body: JSON.stringify({
      userId: grantUserId.value,
      packageName: grantPackage.value,
      durationDays: Number(grantDays.value),
      reason: "support_grant",
    }),
  });
  await refresh();
}

async function createCampaign() {
  error.value = "";
  await api("/api/billing-admin/campaigns", {
    method: "POST",
    body: JSON.stringify({
      title: campaignTitle.value,
      audience: "new_accounts",
      packageName: "cloud",
      durationDays: Number(campaignDays.value),
      tokens: Number(campaignTokens.value),
    }),
  });
  campaignTitle.value = "";
  await refresh();
}

async function launch(id) {
  await api(`/api/billing-admin/campaigns/${id}/launch`, { method: "POST" });
  await refresh();
}

async function pause(id) {
  await api(`/api/billing-admin/campaigns/${id}/pause`, { method: "POST" });
  await refresh();
}

function selectTab(next) {
  tab.value = next;
  if (signedIn.value) {
    refresh();
  }
}
</script>

<template>
  <main class="page">
    <header>
      <h1>Подписки Code2Graph</h1>
      <p>Кабинет оператора. Платёжные реквизиты и почта покупателя здесь не хранятся.</p>
    </header>

    <form v-if="!signedIn" class="card" @submit.prevent="login">
      <label>
        Логин
        <input v-model="username" autocomplete="username" />
      </label>
      <label>
        Пароль
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>
      <button type="submit">Войти</button>
    </form>

    <section v-else>
      <nav>
        <button type="button" @click="selectTab('subscriptions')">Подписки</button>
        <button type="button" @click="selectTab('campaigns')">Кампании</button>
        <button type="button" @click="selectTab('stats')">Статистика</button>
        <button type="button" @click="logout">Выйти</button>
      </nav>

      <section v-if="tab === 'subscriptions'" class="card">
        <form class="inline" @submit.prevent="grant">
          <input v-model="grantUserId" placeholder="user id" />
          <select v-model="grantPackage">
            <option value="cloud">Cloud</option>
            <option value="ai">AI</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <input v-model.number="grantDays" type="number" min="0" />
          <button type="submit">Выдать</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Логин</th>
              <th>Пакет</th>
              <th>Статус</th>
              <th>До</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in subscriptions" :key="row.id">
              <td>{{ row.username }}</td>
              <td>{{ row.packageName }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.periodEnd }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="tab === 'campaigns'" class="card">
        <form class="inline" @submit.prevent="createCampaign">
          <input v-model="campaignTitle" placeholder="Название" />
          <input v-model.number="campaignDays" type="number" min="0" />
          <input v-model.number="campaignTokens" type="number" min="0" />
          <button type="submit">Черновик</button>
        </form>
        <ul>
          <li v-for="campaign in campaigns" :key="campaign.id">
            <span>{{ campaign.title }} — {{ campaign.status }}</span>
            <button v-if="campaign.status === 'draft'" type="button" @click="launch(campaign.id)">Запустить</button>
            <button v-if="campaign.status === 'running'" type="button" @click="pause(campaign.id)">Пауза</button>
          </li>
        </ul>
      </section>

      <section v-else class="card">
        <p v-if="stats">Активные пакеты: {{ JSON.stringify(stats.activeByPackage) }}</p>
        <p v-if="stats">Начислено токенов: {{ stats.tokensGranted }}</p>
        <p v-if="stats">Списано токенов: {{ stats.tokensDebited }}</p>
        <p v-if="stats">Подарки готовы / активированы: {{ stats.giftsReady }} / {{ stats.giftsRedeemed }}</p>
        <p v-if="stats">Гранты кампаний: {{ stats.campaignGrants }}</p>
      </section>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: sans-serif;
  background: #f6f4ef;
  color: #1c1915;
}
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}
.card, form.card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  display: grid;
  gap: 12px;
}
.inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
nav {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  text-align: left;
  padding: 8px 0;
  border-bottom: 1px solid #e6e0d6;
}
.error {
  color: #8d2a2a;
}
</style>
