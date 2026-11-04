<script setup lang="ts">
import { ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import type { fetchSubscriptionGrants } from "@/services/library/api/subscriptions";
import {
  fetchSubscriptionGrants as loadSubscriptionGrants,
  grantSubscription,
  revokeSubscriptionGrant,
} from "@/services/library/api/subscriptions";

const props = defineProps<{
  subscriptionId: string;
  libraryApiUrl: string;
  initialGrants?: Awaited<ReturnType<typeof fetchSubscriptionGrants>>["grants"];
}>();

const emit = defineEmits<{
  "update:grants": [
    grants: Awaited<ReturnType<typeof fetchSubscriptionGrants>>["grants"],
  ];
}>();

const { t } = useLocale();

const grantUsernames = ref("");
const grantPermanent = ref(true);
const grantExpiresAt = ref("");
const isGrantSaving = ref(false);
const grantError = ref("");

function parseUsernames(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function onGrant(): Promise<void> {
  const usernames = parseUsernames(grantUsernames.value);
  if (usernames.length === 0) {
    return;
  }

  isGrantSaving.value = true;
  grantError.value = "";
  try {
    const response = await grantSubscription(
      props.subscriptionId,
      {
        usernames,
        permanent: grantPermanent.value,
        expiresAt: grantPermanent.value ? null : grantExpiresAt.value || null,
      },
      props.libraryApiUrl,
    );
    grantUsernames.value = "";
    emit("update:grants", response.grants);
  } catch (error) {
    grantError.value =
      error instanceof Error ? error.message : t("library.subscriptionGrantError");
  } finally {
    isGrantSaving.value = false;
  }
}

async function onRevokeGrant(userId: string): Promise<void> {
  isGrantSaving.value = true;
  grantError.value = "";
  try {
    await revokeSubscriptionGrant(props.subscriptionId, userId, props.libraryApiUrl);
    const response = await loadSubscriptionGrants(props.subscriptionId, props.libraryApiUrl);
    emit("update:grants", response.grants);
  } catch (error) {
    grantError.value =
      error instanceof Error ? error.message : t("library.subscriptionRevokeError");
  } finally {
    isGrantSaving.value = false;
  }
}
</script>

<template>
  <div class="subscription-card__grants">
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.subscriptionGrantUsers") }}</span>
      <textarea
        v-model="grantUsernames"
        class="textarea"
        rows="3"
        :placeholder="t('library.subscriptionGrantUsersPlaceholder')"
      />
    </label>
    <label class="settings-field settings-field--checkbox">
      <input v-model="grantPermanent" type="checkbox" />
      <span>{{ t("library.accessPermanent") }}</span>
    </label>
    <label v-if="!grantPermanent" class="settings-field">
      <span class="settings-field__label">{{ t("library.accessExpiresAt") }}</span>
      <input v-model="grantExpiresAt" class="select" type="datetime-local" />
    </label>
    <button
      class="btn btn-primary"
      type="button"
      :disabled="isGrantSaving || !grantUsernames.trim()"
      @click="onGrant()"
    >
      {{ isGrantSaving ? t("app.loading") : t("library.subscriptionGrantAction") }}
    </button>
    <p v-if="grantError" class="settings-field__error">{{ grantError }}</p>
    <ul class="subscription-grants-list">
      <li
        v-for="grant in initialGrants ?? []"
        :key="grant.userId"
        class="subscription-grants-list__item"
      >
        <span>{{ grant.username }}</span>
        <span class="subscription-grants-list__meta">
          {{
            grant.permanent
              ? t("library.accessPermanentBadge")
              : t("library.accessUntil", { date: grant.expiresAt ?? "" })
          }}
        </span>
        <button
          class="btn"
          type="button"
          :disabled="isGrantSaving"
          @click="onRevokeGrant(grant.userId)"
        >
          {{ t("library.accessRevoke") }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.subscription-card__grants {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #eee);
}

.subscription-grants-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
}

.subscription-grants-list__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.subscription-grants-list__meta {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-muted, #666);
}
</style>
