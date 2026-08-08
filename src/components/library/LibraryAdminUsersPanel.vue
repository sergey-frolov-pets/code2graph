<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { LibraryUserDto, UserRole } from "@/constants/diagram-library";
import { USER_ROLES } from "@/constants/diagram-library";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  setUserBlocked,
  setUserSubscription,
  updateAdminUser,
} from "@/services/library/api";

const { embedded = true } = defineProps<{
  embedded?: boolean;
}>();

const { t } = useLocale();
const { confirm } = useAppDialog();
const { currentUser } = useLibraryAuth();

const users = ref<LibraryUserDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isSaving = ref(false);

const createUsername = ref("");
const createPassword = ref("");
const createRole = ref<UserRole>("user");
const createSubscription = ref(false);

const isEditOpen = ref(false);
const editingUser = ref<LibraryUserDto | null>(null);
const editUsername = ref("");
const editPassword = ref("");
const editRole = ref<UserRole>("user");
const editBlocked = ref(false);
const editSubscription = ref(false);

const roleOptions = computed(() =>
  USER_ROLES.map((role) => ({
    value: role,
    label: t(`library.adminRole.${role}`),
  })),
);

async function loadUsers(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchAdminUsers();
    users.value = response.users;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.adminUsersError");
  } finally {
    isLoading.value = false;
  }
}

async function onCreateUser(): Promise<void> {
  const username = createUsername.value.trim();
  if (!username || !createPassword.value) {
    errorMessage.value = t("library.adminCreateRequired");
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    const response = await createAdminUser({
      username,
      password: createPassword.value,
      role: createRole.value,
      subscriptionActive: createSubscription.value,
    });
    users.value = [...users.value, response.user].sort((a, b) =>
      a.username.localeCompare(b.username),
    );
    createUsername.value = "";
    createPassword.value = "";
    createRole.value = "user";
    createSubscription.value = false;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.adminCreateError");
  } finally {
    isSaving.value = false;
  }
}

function openEdit(user: LibraryUserDto): void {
  editingUser.value = user;
  editUsername.value = user.username;
  editPassword.value = "";
  editRole.value = user.role;
  editBlocked.value = user.blocked;
  editSubscription.value = user.subscriptionActive;
  isEditOpen.value = true;
}

function closeEdit(): void {
  isEditOpen.value = false;
  editingUser.value = null;
}

async function onSaveEdit(): Promise<void> {
  if (!editingUser.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    const response = await updateAdminUser(editingUser.value.id, {
      username: editUsername.value.trim(),
      password: editPassword.value || undefined,
      role: editRole.value,
      blocked: editBlocked.value,
      subscriptionActive: editSubscription.value,
    });
    const index = users.value.findIndex((entry) => entry.id === response.user.id);
    if (index >= 0) {
      users.value[index] = response.user;
    }
    closeEdit();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.adminUpdateError");
  } finally {
    isSaving.value = false;
  }
}

async function onDeleteUser(user: LibraryUserDto): Promise<void> {
  const accepted = await confirm({
    title: t("library.adminDelete"),
    message: t("library.adminDeleteConfirm", { username: user.username }),
    variant: "danger",
  });
  if (!accepted) {
    return;
  }

  errorMessage.value = "";
  try {
    await deleteAdminUser(user.id);
    users.value = users.value.filter((entry) => entry.id !== user.id);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.adminDeleteError");
  }
}

async function toggleBlocked(user: LibraryUserDto): Promise<void> {
  try {
    const response = await setUserBlocked(user.id, !user.blocked);
    const index = users.value.findIndex((entry) => entry.id === user.id);
    if (index >= 0) {
      users.value[index] = response.user;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.adminUsersError");
  }
}

async function toggleSubscription(user: LibraryUserDto): Promise<void> {
  try {
    const response = await setUserSubscription(user.id, !user.subscriptionActive);
    const index = users.value.findIndex((entry) => entry.id === user.id);
    if (index >= 0) {
      users.value[index] = response.user;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.adminUsersError");
  }
}

onMounted(() => {
  void loadUsers();
});
</script>

<template>
  <div class="library-admin-panel">
    <h3 v-if="!embedded" class="library-admin-panel__title">
      {{ t("library.adminUsersTitle") }}
    </h3>
    <p class="settings-field__hint">{{ t("library.adminUsersHint") }}</p>

    <section class="library-admin-form">
      <h4 class="library-admin-form__title">{{ t("library.adminCreateTitle") }}</h4>
      <div class="library-admin-form__row">
        <input
          v-model="createUsername"
          class="settings-field__input"
          type="text"
          :placeholder="t('library.adminUsername')"
          :disabled="isSaving"
        />
        <input
          v-model="createPassword"
          class="settings-field__input"
          type="password"
          :placeholder="t('library.adminPassword')"
          :disabled="isSaving"
        />
        <select v-model="createRole" class="settings-field__input" :disabled="isSaving">
          <option v-for="option in roleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <label class="library-admin-form__checkbox">
          <input v-model="createSubscription" type="checkbox" :disabled="isSaving" />
          {{ t("library.adminSubscription") }}
        </label>
        <button class="btn btn--primary" type="button" :disabled="isSaving" @click="onCreateUser()">
          {{ t("library.adminCreateSubmit") }}
        </button>
      </div>
    </section>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="settings-field__hint">{{ t("app.loading") }}</p>

    <table v-else class="library-admin-table">
      <thead>
        <tr>
          <th>{{ t("library.adminUsername") }}</th>
          <th>{{ t("library.adminRole") }}</th>
          <th>{{ t("library.adminBlocked") }}</th>
          <th>{{ t("library.adminSubscription") }}</th>
          <th>{{ t("library.adminActions") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.username }}</td>
          <td>{{ t(`library.adminRole.${user.role}`) }}</td>
          <td>
            <button
              class="btn"
              type="button"
              :disabled="user.id === currentUser?.id"
              @click="toggleBlocked(user)"
            >
              {{
                user.blocked ? t("library.adminUnblock") : t("library.adminBlock")
              }}
            </button>
          </td>
          <td>
            <button class="btn" type="button" @click="toggleSubscription(user)">
              {{
                user.subscriptionActive
                  ? t("library.adminRevokeSubscription")
                  : t("library.adminGrantSubscription")
              }}
            </button>
          </td>
          <td class="library-admin-table__actions">
            <button class="btn" type="button" @click="openEdit(user)">
              {{ t("library.adminEdit") }}
            </button>
            <button
              class="btn"
              type="button"
              :disabled="user.id === currentUser?.id"
              @click="onDeleteUser(user)"
            >
              {{ t("library.adminDelete") }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <AppModal
      :open="isEditOpen"
      :title="t('library.adminEditTitle')"
      wide
      @close="closeEdit()"
    >
      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.adminUsername") }}</span>
        <input v-model="editUsername" class="settings-field__input" type="text" />
      </label>
      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.adminPasswordNew") }}</span>
        <input
          v-model="editPassword"
          class="settings-field__input"
          type="password"
          :placeholder="t('library.adminPasswordKeep')"
        />
      </label>
      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.adminRole") }}</span>
        <select v-model="editRole" class="settings-field__input">
          <option v-for="option in roleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label class="library-admin-form__checkbox">
        <input v-model="editBlocked" type="checkbox" />
        {{ t("library.adminBlocked") }}
      </label>
      <label class="library-admin-form__checkbox">
        <input v-model="editSubscription" type="checkbox" />
        {{ t("library.adminSubscription") }}
      </label>
      <div class="modal-actions">
        <button class="btn btn--primary" type="button" :disabled="isSaving" @click="onSaveEdit()">
          {{ t("app.save") }}
        </button>
        <button class="btn" type="button" @click="closeEdit()">
          {{ t("app.cancel") }}
        </button>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.library-admin-panel {
  padding: 8px 0;
}

.library-admin-panel__title {
  margin: 0 0 8px;
}

.library-admin-form {
  margin: 16px 0;
  padding: 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
}

.library-admin-form__title {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.library-admin-form__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.library-admin-form__checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.library-admin-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.9rem;
}

.library-admin-table th,
.library-admin-table td {
  border: 1px solid var(--border-color, #ddd);
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.library-admin-table__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
