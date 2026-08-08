<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import LibrarySubscriptionModal from "@/components/library/LibrarySubscriptionModal.vue";
import type { SubscriptionDto } from "@/constants/diagram-library";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import {
  deleteSubscription,
  fetchSubscriptionGrants,
  fetchSubscriptions,
  grantSubscription,
  revokeSubscriptionGrant,
} from "@/services/library/api";

const props = defineProps<{
  flatSectionOptions: FlatSectionOption[];
}>();

const { t } = useLocale();
const { confirm } = useAppDialog();

const subscriptions = ref<SubscriptionDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const editingSubscription = ref<SubscriptionDto | null>(null);

const expandedSubscriptionId = ref<string | null>(null);
const grantsBySubscription = ref<Record<string, Awaited<ReturnType<typeof fetchSubscriptionGrants>>["grants"]>>({});
const grantUsername = ref("");
const grantPermanent = ref(true);
const grantExpiresAt = ref("");
const isGrantSaving = ref(false);
const grantError = ref("");

const manageableSections = computed(() => props.flatSectionOptions);

async function loadSubscriptions(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchSubscriptions();
    subscriptions.value = response.subscriptions;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.subscriptionLoadError");
  } finally {
    isLoading.value = false;
  }
}

function openCreateModal(): void {
  editingSubscription.value = null;
  isModalOpen.value = true;
}

function openEditModal(subscription: SubscriptionDto): void {
  editingSubscription.value = subscription;
  isModalOpen.value = true;
}

function onModalSaved(subscription: SubscriptionDto): void {
  const index = subscriptions.value.findIndex((entry) => entry.id === subscription.id);
  if (index >= 0) {
    subscriptions.value[index] = subscription;
  } else {
    subscriptions.value = [...subscriptions.value, subscription].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }
}

async function onDelete(subscription: SubscriptionDto): Promise<void> {
  const confirmed = await confirm({
    title: t("app.delete"),
    message: t("library.subscriptionDeleteConfirm", { title: subscription.title }),
    variant: "danger",
    confirmLabel: t("app.delete"),
  });
  if (!confirmed) {
    return;
  }

  try {
    await deleteSubscription(subscription.id);
    subscriptions.value = subscriptions.value.filter((entry) => entry.id !== subscription.id);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.subscriptionDeleteError");
  }
}

async function toggleGrants(subscriptionId: string): Promise<void> {
  if (expandedSubscriptionId.value === subscriptionId) {
    expandedSubscriptionId.value = null;
    return;
  }

  expandedSubscriptionId.value = subscriptionId;
  grantUsername.value = "";
  grantError.value = "";

  if (!grantsBySubscription.value[subscriptionId]) {
    try {
      const response = await fetchSubscriptionGrants(subscriptionId);
      grantsBySubscription.value = {
        ...grantsBySubscription.value,
        [subscriptionId]: response.grants,
      };
    } catch (error) {
      grantError.value =
        error instanceof Error ? error.message : t("library.subscriptionGrantsLoadError");
    }
  }
}

async function onGrant(subscriptionId: string): Promise<void> {
  if (!grantUsername.value.trim()) {
    return;
  }

  isGrantSaving.value = true;
  grantError.value = "";
  try {
    await grantSubscription(subscriptionId, {
      username: grantUsername.value.trim(),
      permanent: grantPermanent.value,
      expiresAt: grantPermanent.value ? null : grantExpiresAt.value || null,
    });
    grantUsername.value = "";
    const response = await fetchSubscriptionGrants(subscriptionId);
    grantsBySubscription.value = {
      ...grantsBySubscription.value,
      [subscriptionId]: response.grants,
    };
  } catch (error) {
    grantError.value =
      error instanceof Error ? error.message : t("library.subscriptionGrantError");
  } finally {
    isGrantSaving.value = false;
  }
}

async function onRevokeGrant(subscriptionId: string, userId: string): Promise<void> {
  isGrantSaving.value = true;
  grantError.value = "";
  try {
    await revokeSubscriptionGrant(subscriptionId, userId);
    const response = await fetchSubscriptionGrants(subscriptionId);
    grantsBySubscription.value = {
      ...grantsBySubscription.value,
      [subscriptionId]: response.grants,
    };
  } catch (error) {
    grantError.value =
      error instanceof Error ? error.message : t("library.subscriptionRevokeError");
  } finally {
    isGrantSaving.value = false;
  }
}

onMounted(() => {
  void loadSubscriptions();
});
</script>

<template>
  <div class="library-step">
    <div class="library-step__toolbar library-step__toolbar--actions-only">
      <div class="library-step__toolbar-actions">
        <IconButton :label="t('library.subscriptionAddTitle')" @click="openCreateModal()">
          <ActionIcon name="plus" />
        </IconButton>
      </div>
    </div>

    <div class="library-step__content library-step__content--padded">
      <p v-if="isLoading" class="library-empty">{{ t("app.loading") }}</p>
      <p v-else-if="errorMessage" class="library-empty">{{ errorMessage }}</p>
      <p v-else-if="subscriptions.length === 0" class="library-empty">
        {{ t("library.subscriptionEmpty") }}
      </p>

      <article
        v-for="subscription in subscriptions"
        :key="subscription.id"
        class="subscription-card"
      >
        <header class="subscription-card__header">
          <div>
            <h3 class="subscription-card__title">{{ subscription.title }}</h3>
            <p v-if="subscription.description" class="subscription-card__description">
              {{ subscription.description }}
            </p>
            <p class="subscription-card__meta">
              {{ t(`library.accessPermission.${subscription.permission}`) }}
              ·
              {{ t("library.subscriptionSectionCount", { count: subscription.sections.length }) }}
            </p>
          </div>
          <div class="subscription-card__actions">
            <button class="btn" type="button" @click="openEditModal(subscription)">
              {{ t("library.edit") }}
            </button>
            <button class="btn" type="button" @click="toggleGrants(subscription.id)">
              {{ t("library.subscriptionGrants") }}
            </button>
            <button class="btn" type="button" @click="onDelete(subscription)">
              {{ t("app.delete") }}
            </button>
          </div>
        </header>

        <ul v-if="subscription.sections.length" class="subscription-card__sections">
          <li v-for="section in subscription.sections" :key="section.sectionId">
            {{ section.sectionTitle ?? section.sectionId }}
            <span v-if="section.includeDescendants" class="subscription-card__nested-badge">
              {{ t("library.subscriptionIncludeDescendantsShort") }}
            </span>
          </li>
        </ul>

        <div
          v-if="expandedSubscriptionId === subscription.id"
          class="subscription-card__grants"
        >
          <label class="settings-field">
            <span class="settings-field__label">{{ t("library.accessUsername") }}</span>
            <input v-model="grantUsername" class="select" type="text" />
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
            :disabled="isGrantSaving || !grantUsername.trim()"
            @click="onGrant(subscription.id)"
          >
            {{ isGrantSaving ? t("app.loading") : t("library.subscriptionGrantAction") }}
          </button>
          <p v-if="grantError" class="settings-field__error">{{ grantError }}</p>
          <ul class="subscription-grants-list">
            <li
              v-for="grant in grantsBySubscription[subscription.id] ?? []"
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
                @click="onRevokeGrant(subscription.id, grant.userId)"
              >
                {{ t("library.accessRevoke") }}
              </button>
            </li>
          </ul>
        </div>
      </article>
    </div>

    <LibrarySubscriptionModal
      :open="isModalOpen"
      :subscription="editingSubscription"
      :flat-section-options="manageableSections"
      @close="isModalOpen = false"
      @saved="onModalSaved($event)"
    />
  </div>
</template>

<style scoped>
.subscription-card {
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.subscription-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.subscription-card__title {
  margin: 0;
  font-size: 1rem;
}

.subscription-card__description {
  margin: 6px 0 0;
  color: var(--text-muted, #666);
}

.subscription-card__meta {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted, #666);
}

.subscription-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.subscription-card__sections {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 0.9rem;
}

.subscription-card__nested-badge {
  margin-left: 6px;
  font-size: 0.75rem;
  color: var(--accent-color, #1a56db);
}

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
