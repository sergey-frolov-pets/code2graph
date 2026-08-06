<script setup lang="ts">
import { ref, watch } from "vue";
import type { LibraryUserDto } from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";
import {
  fetchAdminUsers,
  setUserBlocked,
  setUserSubscription,
} from "@/utils/diagram-api";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
const users = ref<LibraryUserDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

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

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadUsers();
    }
  },
);
</script>

<template>
  <div v-if="open" class="library-admin-panel">
    <h3 class="library-admin-panel__title">{{ t("library.adminUsersTitle") }}</h3>
    <p class="settings-field__hint">{{ t("library.adminUsersHint") }}</p>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="settings-field__hint">{{ t("app.loading") }}</p>

    <table v-else class="library-admin-table">
      <thead>
        <tr>
          <th>{{ t("library.adminUsername") }}</th>
          <th>{{ t("library.adminRole") }}</th>
          <th>{{ t("library.adminBlocked") }}</th>
          <th>{{ t("library.adminSubscription") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.username }}</td>
          <td>{{ user.role }}</td>
          <td>
            <button class="btn" type="button" @click="toggleBlocked(user)">
              {{
                user.blocked
                  ? t("library.adminUnblock")
                  : t("library.adminBlock")
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
        </tr>
      </tbody>
    </table>

    <button class="btn" type="button" @click="emit('close')">
      {{ t("app.close") }}
    </button>
  </div>
</template>

<style scoped>
.library-admin-panel {
  padding: 8px 0;
}

.library-admin-panel__title {
  margin: 0 0 8px;
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
}
</style>
