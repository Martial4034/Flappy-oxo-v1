import {
  backButton,
  viewport,
  themeParams,
  miniApp,
  initData,
  $debug,
  init as initSDK,
} from '@telegram-apps/sdk-react';

/**
 * Initializes the application and configures its dependencies.
 */
export async function init(debug: boolean): Promise<void> {
  // Set @telegram-apps/sdk-react debug mode.
  $debug.set(debug);

  // Initialize special event handlers for Telegram Desktop, Android, iOS, etc.
  // Also, configure the package.
  initSDK();

  // Mount all components used in the project.
  backButton.isSupported() && backButton.mount();
  miniApp.mount();
  themeParams.mount();
  initData.restore();
  
  try {
    // Wait for the viewport to be mounted
    await viewport.mount();
    
    // Define CSS variables only after the complete mount
    viewport.bindCssVars();
    miniApp.bindCssVars();
    themeParams.bindCssVars();
  } catch (e) {
    console.error('Something went wrong mounting the viewport', e);
  }

  // Add Eruda if needed.
  if (debug) {
    try {
      const lib = await import('eruda');
      lib.default.init();
    } catch (error) {
      console.error(error);
    }
  }
}