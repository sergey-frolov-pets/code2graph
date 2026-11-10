<script setup lang="ts">
import { ref } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import WizardExampleThumb from "@/components/wizard/WizardExampleThumb.vue";
import WizardFavoriteToggle from "@/components/wizard/WizardFavoriteToggle.vue";
import type { WizardFavoriteCard } from "@/constants/wizard-favorites";
import type { WizardLocalFavoriteOption } from "@/composables/wizard/useWizardFavoriteGallery";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  items: readonly WizardFavoriteCard[];
  localDiagrams: readonly WizardLocalFavoriteOption[];
  localOpen: boolean;
  linkError: string;
  notice: string;
  busy: boolean;
}>();

const linkDraft = defineModel<string>("linkDraft", { required: true });

const emit = defineEmits<{
  open: [id: string];
  remove: [id: string];
  "move-earlier": [id: string];
  "move-later": [id: string];
  "move-before": [id: string, targetId: string];
  "toggle-local": [];
  "toggle-local-diagram": [diagramId: string];
  "submit-link": [];
}>();

const { t } = useLocale();
const draggingId = ref<string | null>(null);
const dropTargetId = ref<string | null>(null);

function kindLabel(kind: WizardFavoriteCard["kind"]): string {
  if (kind === "example") {
    return t("llm.wizard.gallery.favorite.kind.example");
  }

  if (kind === "local") {
    return t("llm.wizard.gallery.favorite.kind.local");
  }

  return t("llm.wizard.gallery.favorite.kind.serverLink");
}

function onDragStart(id: string, event: DragEvent): void {
  draggingId.value = id;
  event.dataTransfer?.setData("text/plain", id);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function onDragOver(id: string, event: DragEvent): void {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  dropTargetId.value = id;
}

function onDrop(targetId: string): void {
  const sourceId = draggingId.value;
  draggingId.value = null;
  dropTargetId.value = null;
  if (!sourceId || sourceId === targetId) {
    return;
  }

  emit("move-before", sourceId, targetId);
}

function onDragEnd(): void {
  draggingId.value = null;
  dropTargetId.value = null;
}
</script>

<template>
  <section
    class="wizard-favorites"
    data-testid="wizard-favorites"
    :aria-label="t('llm.wizard.gallery.favorite.heading')"
  >
    <h2 class="wizard-favorites__heading">
      {{ t("llm.wizard.gallery.favorite.heading") }}
    </h2>
    <p
      v-if="notice"
      class="wizard-favorites__notice"
      role="alert"
    >
      {{ notice }}
    </p>
    <p
      v-if="items.length === 0"
      class="wizard-favorites__empty"
    >
      {{ t("llm.wizard.gallery.favorite.empty") }}
    </p>
    <ul
      v-else
      class="wizard-favorites__list"
      :aria-label="t('llm.wizard.gallery.favorite.listLabel')"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="wizard-favorites__card"
        :class="{ 'is-drop-target': dropTargetId === item.id }"
        :data-favorite-id="item.id"
        @dragover.prevent="onDragOver(item.id, $event)"
        @drop.prevent="onDrop(item.id)"
      >
        <div class="wizard-favorites__tools">
          <button
            type="button"
            class="wizard-favorites__handle"
            draggable="true"
            :aria-label="t('llm.wizard.gallery.favorite.dragHint')"
            @dragstart="onDragStart(item.id, $event)"
            @dragend="onDragEnd"
          >
            <span aria-hidden="true">⋮⋮</span>
          </button>
          <button
            type="button"
            class="wizard-favorites__order"
            :disabled="!item.canMoveEarlier"
            :aria-label="t('llm.wizard.gallery.favorite.moveEarlier')"
            data-testid="wizard-favorite-earlier"
            @click="emit('move-earlier', item.id)"
          >
            <ActionIcon name="back" />
          </button>
          <button
            type="button"
            class="wizard-favorites__order"
            :disabled="!item.canMoveLater"
            :aria-label="t('llm.wizard.gallery.favorite.moveLater')"
            data-testid="wizard-favorite-later"
            @click="emit('move-later', item.id)"
          >
            <ActionIcon name="next" />
          </button>
          <WizardFavoriteToggle
            :active="true"
            data-testid="wizard-favorite-remove"
            @toggle="emit('remove', item.id)"
          />
        </div>
        <button
          type="button"
          class="wizard-favorites__open wizard-example__open"
          :disabled="!item.canOpen"
          :aria-label="t('llm.wizard.gallery.favorite.open', { title: item.title })"
          data-testid="wizard-favorite-open"
          @click="emit('open', item.id)"
        >
          <WizardExampleThumb
            v-if="item.svg"
            :svg="item.svg"
          />
          <span
            v-else
            class="wizard-example__fallback"
          >
            {{ item.title }}
          </span>
        </button>
        <p class="wizard-favorites__title">
          {{ item.title }}
        </p>
        <p class="wizard-favorites__kind">
          {{ kindLabel(item.kind) }}
        </p>
      </li>
    </ul>
    <div class="wizard-favorites__add">
      <button
        type="button"
        class="wizard-favorites__button"
        :aria-expanded="localOpen"
        data-testid="wizard-favorite-local-toggle"
        @click="emit('toggle-local')"
      >
        {{ t("llm.wizard.gallery.favorite.fromLocal") }}
      </button>
      <form
        class="wizard-favorites__link"
        @submit.prevent="emit('submit-link')"
      >
        <label class="wizard-favorites__link-label">
          <span>{{ t("llm.wizard.gallery.favorite.linkLabel") }}</span>
          <input
            v-model="linkDraft"
            class="wizard-favorites__input"
            type="text"
            :placeholder="t('llm.wizard.gallery.favorite.linkPlaceholder')"
            data-testid="wizard-favorite-link"
          >
        </label>
        <button
          type="submit"
          class="wizard-favorites__button"
          :disabled="busy"
          data-testid="wizard-favorite-add-link"
        >
          {{ t("llm.wizard.gallery.favorite.addLink") }}
        </button>
      </form>
    </div>
    <p
      v-if="linkError"
      class="wizard-favorites__notice"
      role="alert"
      data-testid="wizard-favorite-link-error"
    >
      {{ linkError }}
    </p>
    <ul
      v-if="localOpen"
      class="wizard-favorites__local"
      :aria-label="t('llm.wizard.gallery.favorite.localLabel')"
    >
      <li
        v-if="localDiagrams.length === 0"
        class="wizard-favorites__empty"
      >
        {{ t("llm.wizard.gallery.favorite.localEmpty") }}
      </li>
      <li
        v-for="diagram in localDiagrams"
        :key="diagram.id"
      >
        <button
          type="button"
          class="wizard-favorites__button wizard-favorites__local-item"
          :aria-pressed="diagram.added"
          @click="emit('toggle-local-diagram', diagram.id)"
        >
          {{ diagram.title }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style src="./wizard-modal.css"></style>
