import WebApp from '@twa-dev/sdk';

/** Initialize the Telegram Mini App context */
export function initTelegramApp(): void {
  WebApp.ready();
  WebApp.expand();
  WebApp.enableClosingConfirmation();
}

/** Show the MainButton with a label and click handler */
export function showMainButton(text: string, onClick: () => void): void {
  WebApp.MainButton.setText(text);
  WebApp.MainButton.show();
  WebApp.MainButton.onClick(onClick);
}

/** Hide the MainButton */
export function hideMainButton(): void {
  WebApp.MainButton.hide();
  WebApp.MainButton.offClick(() => {});
}

/** Show loading state on MainButton */
export function setMainButtonLoading(loading: boolean): void {
  if (loading) {
    WebApp.MainButton.showProgress();
  } else {
    WebApp.MainButton.hideProgress();
  }
}

/** Trigger haptic feedback */
export function hapticFeedback(type: 'impact' | 'notification' | 'selection'): void {
  if (type === 'impact') {
    WebApp.HapticFeedback.impactOccurred('medium');
  } else if (type === 'notification') {
    WebApp.HapticFeedback.notificationOccurred('success');
  } else {
    WebApp.HapticFeedback.selectionChanged();
  }
}

/** Get Telegram user info */
export function getTelegramUser() {
  return WebApp.initDataUnsafe.user;
}

/** Get the color scheme (dark/light) */
export function getColorScheme(): 'dark' | 'light' {
  return WebApp.colorScheme;
}

/** Close the Mini App */
export function closeApp(): void {
  WebApp.close();
}

export { WebApp };
