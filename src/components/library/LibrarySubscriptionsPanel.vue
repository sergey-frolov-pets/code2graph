<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import LibrarySubscriptionModal from "@/components/library/LibrarySubscriptionModal.vue";
import type {
  GrantedSubscriptionDto,
  SubscriptionDto,
} from "@/constants/diagram-library";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import {
  buildSubscriptionAccessUrl,
  deleteSubscription,
  fetchMySubscriptions,
  fetchSubscriptionGrants,
  fetchSubscriptions,
  grantSubscription,
  revokeSubscriptionGrant,
} from "@/services/library/api/subscriptions";

const props = defineProps<{
  flatSectionOptions: FlatSectionOption[];
  canManage: boolean;
  libraryApiUrl: string;
}>();

const emit = defineEmits<{
  "open-subscription-target": [
    payload: {
      type: "section" | "diagram";
      id: string;
      subscription?: GrantedSubscriptionDto | SubscriptionDto;
    },
  ];
}>();

const { t } = useLocale();
const { confirm } = useAppDialog();

type PanelTab = "mine" | "manage";

const activeTab = ref<PanelTab>("mine");
const ownedSubscriptions = ref<SubscriptionDto[]>([]);
const mySubscriptions = ref<GrantedSubscriptionDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const editingSubscription = ref<SubscriptionDto | null>(null);
const expandedSubscriptionId = ref<string | null>(null);
const grantsBySubscription = ref<
  Record<string, Awaited<ReturnType<typeof fetchSubscriptionGrants>>["grants"]>
>({});
const grantUsernames = ref("");
const grantPermanent = ref(true);
const grantExpiresAt = ref("");
const isGrantSaving = ref(false);
const grantError = ref("");
const expandedMySubscriptionId = ref<string | null>(null);

const manageableSections = computed(() => props.flatSectionOptions);

async function loadSubscriptions(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [mineResponse, ownedResponse] = await Promise.all([
      fetchMySubscriptions(props.libraryApiUrl),
      props.canManage
        ? fetchSubscriptions(props.libraryApiUrl)
        : Promise.resolve({ subscriptions: [] as SubscriptionDto[] }),
    ]);
    mySubscriptions.value = mineResponse.subscriptions;
    ownedSubscriptions.value = ownedResponse.subscriptions;
    if (!props.canManage && mySubscriptions.value.length > 0) {
      activeTab.value = "mine";
    } else if (props.canManage) {
      activeTab.value = activeTab.value === "manage" ? "manage" : "mine";
    }
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
  const index = ownedSubscriptions.value.findIndex((entry) => entry.id === subscription.id);
  if (index >= 0) {
    ownedSubscriptions.value[index] = subscription;
  } else {
    ownedSubscriptions.value = [...ownedSubscriptions.value, subscription].sort((a, b) =>
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
    await deleteSubscription(subscription.id, props.libraryApiUrl);
    ownedSubscriptions.value = ownedSubscriptions.value.filter(
      (entry) => entry.id !== subscription.id,
    );
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
  grantUsernames.value = "";
  grantError.value = "";

  if (!grantsBySubscription.value[subscriptionId]) {
    try {
      const response = await fetchSubscriptionGrants(subscriptionId, props.libraryApiUrl);
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

function parseUsernames(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function onGrant(subscriptionId: string): Promise<void> {
  const usernames = parseUsernames(grantUsernames.value);
  if (usernames.length === 0) {
    return;
  }

  isGrantSaving.value = true;
  grantError.value = "";
  try {
    const response = await grantSubscription(
      subscriptionId,
      {
        usernames,
        permanent: grantPermanent.value,
        expiresAt: grantPermanent.value ? null : grantExpiresAt.value || null,
      },
      props.libraryApiUrl,
    );
    grantUsernames.value = "";
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
    await revokeSubscriptionGrant(subscriptionId, userId, props.libraryApiUrl);
    const response = await fetchSubscriptionGrants(subscriptionId, props.libraryApiUrl);
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

function toggleMySubscriptionDetails(subscriptionId: string): void {
  expandedMySubscriptionId.value =
    expandedMySubscriptionId.value === subscriptionId ? null : subscriptionId;
}

async function copyAccessLink(subscription: SubscriptionDto): Promise<void> {
  if (!subscription.urlPath) {
    return;
  }
  try {
    await navigator.clipboard.writeText(buildSubscriptionAccessUrl(subscription.urlPath));
  } catch {
    // ignore
  }
}

function openTarget(
  type: "section" | "diagram",
  id: string,
  subscription?: GrantedSubscriptionDto | SubscriptionDto,
): void {
  emit("open-subscription-target", { type, id, subscription });
}

onMounted(() => {
  void loadSubscriptions();
});
</script>

<template>
  <div class="library-step">
    <div class="library-step__toolbar library-step__toolbar--actions-only">
      <div class="library-step__toolbar-actions">
        <button
          class="btn"
          :class="{ 'btn-primary': activeTab === 'mine' }"
          type="button"
          @click="activeTab = 'mine'"
        >
          {{ t("library.mySubscriptionsTitle") }}
        </button>
        <button
          v-if="canManage"
          class="btn"
          :class="{ 'btn-primary': activeTab === 'manage' }"
          type="button"
          @click="activeTab = 'manage'"
        >
          {{ t("library.manageSubscriptionsTitle") }}
        </button>
        <IconButton
          v-if="canManage && activeTab === 'manage'"
          :label="t('library.subscriptionAddTitle')"
          @click="openCreateModal()"
        >
          <ActionIcon name="plus" />
        </IconButton>
      </div>
    </div>

    <div class="library-step__content library-step__content--padded">
      <p v-if="isLoading" class="library-empty">{{ t("app.loading") }}</p>
      <p v-else-if="errorMessage" class="library-empty">{{ errorMessage }}</p>

      <template v-else-if="activeTab === 'mine'">
        <p v-if="mySubscriptions.length === 0" class="library-empty">
          {{ t("library.mySubscriptionsEmpty") }}
        </p>

        <article
          v-for="subscription in mySubscriptions"
          :key="subscription.id"
          class="subscription-card"
        >
          <header class="subscription-card__header">
            <div>
              <h3 class="subscription-card__title">{{ subscription.title }}</h3>
              <p class="subscription-card__meta">
                {{ t("library.subscriptionOwner", { owner: subscription.ownerUsername }) }}
                ·
                {{ t(`library.accessPermission.${subscription.permission}`) }}
              </p>
              <p class="subscription-card__meta">
                {{
                  subscription.grantPermanent
                    ? t("library.accessPermanentBadge")
                    : t("library.accessUntil", { date: subscription.grantExpiresAt ?? "" })
                }}
              </p>
            </div>
            <button
              class="btn"
              type="button"
              @click="toggleMySubscriptionDetails(subscription.id)"
            >
              {{ t("library.subscriptionDetails") }}
            </button>
          </header>

          <div
            v-if="expandedMySubscriptionId === subscription.id"
            class="subscription-card__details"
          >
            <p v-if="subscription.description" class="subscription-card__description">
              {{ subscription.description }}
            </p>
            <p v-else class="subscription-card__description">
              {{ t("library.subscriptionNoDescription") }}
            </p>

            <div class="subscription-card__targets">
              <button
                v-for="section in subscription.sections"
                :key="section.sectionId"
                class="btn"
                type="button"
                @click="openTarget('section', section.sectionId, subscription)"
              >
                {{ section.sectionTitle ?? section.sectionId }}
              </button>
              <button
                v-for="diagram in subscription.diagrams"
                :key="diagram.diagramId"
                class="btn"
                type="button"
                @click="openTarget('diagram', diagram.diagramId, subscription)"
              >
                {{ diagram.diagramTitle ?? diagram.diagramId }}
              </button>
            </div>
          </div>
        </article>
      </template>

      <template v-else>
        <p v-if="ownedSubscriptions.length === 0" class="library-empty">
          {{ t("library.subscriptionEmpty") }}
        </p>

        <article
          v-for="subscription in ownedSubscriptions"
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
                {{ t(`library.subscriptionDistributionMode.${subscription.distributionMode}`) }}
                ·
                {{
                  t("library.subscriptionTargetCount", {
                    sections: subscription.sections.length,
                    diagrams: subscription.diagrams.length,
                  })
                }}
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

          <div
            v-if="subscription.urlPath"
            class="subscription-card__link"
          >
            <input
              class="select"
              type="text"
              readonly
              :value="buildSubscriptionAccessUrl(subscription.urlPath)"
            />
            <button class="btn" type="button" @click="copyAccessLink(subscription)">
              {{ t("library.shareCopy") }}
            </button>
          </div>

          <ul v-if="subscription.sections.length" class="subscription-card__sections">
            <li v-for="section in subscription.sections" :key="section.sectionId">
              {{ section.sectionTitle ?? section.sectionId }}
              <span v-if="section.includeDescendants" class="subscription-card__nested-badge">
                {{ t("library.subscriptionIncludeDescendantsShort") }}
              </span>
            </li>
          </ul>
          <ul v-if="subscription.diagrams.length" class="subscription-card__sections">
            <li v-for="diagram in subscription.diagrams" :key="diagram.diagramId">
              {{ diagram.diagramTitle ?? diagram.diagramId }}
            </li>
          </ul>

          <div
            v-if="expandedSubscriptionId === subscription.id"
            class="subscription-card__grants"
          >
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
      </template>
    </div>

    <LibrarySubscriptionModal
      :open="isModalOpen"
      :subscription="editingSubscription"
      :flat-section-options="manageableSections"
      :library-api-url="libraryApiUrl"
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

.subscription-card__grants,
.subscription-card__details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #eee);
}

.subscription-card__targets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.subscription-card__link {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.subscription-card__link .select {
  flex: 1;
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
