import { onUnmounted, watch, type Ref } from "vue";
import { useModalStack, type ModalLayer } from "@/composables/useModalStack";

export function useModalStackEntry(
  modalId: string,
  open: Ref<boolean>,
  onClose: () => void,
  layer: ModalLayer = "default",
): void {
  const { pushModal, popModal } = useModalStack();

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        pushModal(modalId, onClose, layer);
        return;
      }
      popModal(modalId);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    popModal(modalId);
  });
}
