const { app, BrowserWindow, Menu, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Robust development detection
const isDev = process.env.NODE_ENV === 'development' || 
              process.env.ELECTRON_IS_DEV === 'true' || 
              !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;
let timerWindow = null;

// Comprehensive Windows fixes for white window issue
if (process.platform === 'win32') {
  // Core GPU and compositing fixes
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu-rasterization');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('disable-accelerated-video-decode');
  app.commandLine.appendSwitch('disable-accelerated-mjpeg-decode');
  app.commandLine.appendSwitch('disable-accelerated-video-encode');
  
  // Disable problematic features
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor,VizHitTestSurfaceLayer,TranslateUI,BlinkGenPropertyTrees,VizSurfaceSynchronization');
  app.commandLine.appendSwitch('disable-blink-features', 'Accelerated2dCanvas,AcceleratedSmallCanvases');
  
  // Rendering and compositor fixes
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-background-media-suspend');
  
  // Security and sandbox
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('disable-ipc-flooding-protection');
  
  // Additional white window fixes
  app.commandLine.appendSwitch('disable-direct-composition');
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('disable-gpu-blacklist');
  app.commandLine.appendSwitch('ignore-gpu-blacklist');
  app.commandLine.appendSwitch('use-gl', 'swiftshader');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('disable-lcd-text');
  app.commandLine.appendSwitch('disable-smooth-scrolling');
}

function createWindow() {
  // Only create window if app is ready
  if (!app.isReady()) {
    console.log('App not ready, waiting...');
    return;
  }

  // Create the browser window with performance optimizations
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Disabled for API requests in desktop app
      allowRunningInsecureContent: false,
      // Performance optimizations
      experimentalFeatures: true,
      enableBlinkFeatures: 'CSSContainerQueries',
      v8CacheOptions: 'code',
      // Hardware acceleration - completely disabled on Windows to prevent white window
      hardwareAcceleration: false,
      // Rendering optimizations
      backgroundThrottling: false,
      offscreen: false,
      paintWhenInitiallyHidden: true,
      // Windows-specific comprehensive fixes for white window issue
      ...(process.platform === 'win32' && {
        useSharedTexture: false,
        disableAcceleration: true,
        enableWebGL: false,
        enableGPURendering: false,
        enableBlinkFeatures: '',
        disableBlinkFeatures: 'Accelerated2dCanvas,AcceleratedSmallCanvases,WebGL,WebGL2',
        spellcheck: false,
        partition: 'persist:main',
        additionalArguments: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-direct-composition',
          '--disable-gpu-compositing',
          '--force-cpu-draw',
          '--disable-features=VizDisplayCompositor',
          '--use-gl=swiftshader-webgl'
        ]
      })
    },
    titleBarStyle: process.platform === 'darwin' ? 'default' : 'default',
    show: false, // Don't show until ready
    // Ensure window is movable on macOS
    movable: true,
    // Performance flags for white window prevention
    paintWhenInitiallyHidden: true,
    thickFrame: false,
    // Better responsiveness
    skipTaskbar: false,
    resizable: true,
    // Enhanced Windows-specific window options for white window prevention
    ...(process.platform === 'win32' && {
      transparent: false,
      frame: true,
      hasShadow: true,
      opacity: 1.0,
      alwaysOnTop: false,
      focusable: true,
      minimizable: true,
      maximizable: true,
      closable: true,
      fullscreenable: true,
      kiosk: false,
      autoHideMenuBar: false,
      enableLargerThanScreen: false,
      darkTheme: false,
      vibrancy: null,
      zoomToPageWidth: false,
      tabbingIdentifier: undefined,
      webSecurity: true,
      // Additional white window prevention
      backgroundColor: '#ffffff',
      titleBarOverlay: false,
      roundedCorners: false,
      disableAutoHideCursor: true,
      useContentSize: false,
      acceptFirstMouse: false,
      titleBarStyle: 'default'
    })
  });

  // Load the app
  const startUrl = getStartUrl();
  console.log('Loading URL:', startUrl);
  
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
    handleWindowError(`Failed to load URL: ${startUrl}, Error: ${err.message}`);
  });

  // Enhanced window showing with white window prevention
  mainWindow.once('ready-to-show', () => {
    // Windows-specific pre-show fixes
    if (process.platform === 'win32') {
      // Ensure content is loaded before showing
      mainWindow.webContents.executeJavaScript(`
        // Force body visibility
        if (document.body) {
          document.body.style.visibility = 'visible';
          document.body.style.opacity = '1';
          document.body.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff';
        }
        
        // Force app root visibility
        const appRoot = document.getElementById('root');
        if (appRoot) {
          appRoot.style.visibility = 'visible';
          appRoot.style.opacity = '1';
        }
        
        // Disable hardware acceleration on elements
        document.documentElement.style.transform = 'translateZ(0)';
        document.documentElement.style.backfaceVisibility = 'hidden';
        
        // Return ready status
        true;
      `).then(() => {
        // Show window after content is ready
        mainWindow.show();
        
        // Additional repaint cycle
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              // Multiple reflow triggers
              document.body.style.display = 'none';
              document.body.offsetHeight;
              document.body.style.display = '';
              
              // Force repaint
              document.documentElement.style.transform = 'translateZ(0)';
              setTimeout(() => {
                document.documentElement.style.transform = '';
              }, 50);
            `).catch(() => {});
          }
        }, 200);
        
      }).catch(() => {
        // Fallback: show window anyway
        mainWindow.show();
      });
    } else {
      // Non-Windows: normal show
      mainWindow.show();
    }
    
    // Only open DevTools when explicitly needed in development
    if (isDev && process.env.ELECTRON_ENABLE_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Windows-specific event handlers for white window issue
  if (process.platform === 'win32') {
    // Handle window focus events
    mainWindow.on('focus', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          if (document.body.style.display === 'none') {
            document.body.style.display = '';
          }
        `).catch(() => {});
      }
    });
    
    // Handle window blur events
    mainWindow.on('blur', () => {
      // Prevent background issues
    });
    
    // Handle resize events
    mainWindow.on('resize', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Force repaint on resize
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(`
            document.body.style.transform = 'translateZ(0)';
            setTimeout(() => {
              document.body.style.transform = '';
            }, 50);
          `).catch(() => {});
        }, 10);
      }
    });
    
    // Handle minimize/restore events
    mainWindow.on('minimize', () => {
      // Handle minimize
    });
    
    mainWindow.on('restore', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Force repaint on restore
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(`
            document.body.style.display = 'none';
            document.body.offsetHeight; // Force reflow
            document.body.style.display = '';
          `).catch(() => {});
        }, 100);
      }
    });
    
    // Handle window state changes
    mainWindow.on('maximize', () => {
      // Handle maximize
    });
    
    mainWindow.on('unmaximize', () => {
      // Handle unmaximize
    });
  }

  // Performance: Disable background throttling for smooth experience
  mainWindow.webContents.setBackgroundThrottling(false);
  
  // Performance: Optimize for desktop
  mainWindow.webContents.setVisualZoomLevelLimits(1, 3);
  
  // Faster navigation
  mainWindow.webContents.on('did-start-loading', () => {
    // Optional loading indicator could go here
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    // Ensure good performance after load
    if (mainWindow) {
      mainWindow.webContents.setBackgroundThrottling(false);
      
      // Windows-specific comprehensive fixes for white window issue after load
      if (process.platform === 'win32') {
        // Immediate fix
        mainWindow.webContents.executeJavaScript(`
          // Comprehensive visibility and styling fixes
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
            document.body.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff';
            document.body.style.minHeight = '100vh';
          }
          
          // Ensure app root is visible
          const appRoot = document.getElementById('root');
          if (appRoot) {
            appRoot.style.visibility = 'visible';
            appRoot.style.opacity = '1';
            appRoot.style.minHeight = '100vh';
          }
          
          // Remove any white flash elements
          const whiteElements = document.querySelectorAll('[style*="background"]');
          whiteElements.forEach(el => {
            if (el.style.backgroundColor === 'white' || el.style.backgroundColor === '#ffffff') {
              el.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff';
            }
          });
          
          // Force hardware acceleration reset
          document.documentElement.style.webkitTransform = 'translateZ(0)';
          document.documentElement.style.transform = 'translateZ(0)';
          document.documentElement.style.backfaceVisibility = 'hidden';
        `).catch(() => {});
        
        // Delayed comprehensive repaint
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              // Multiple reflow and repaint triggers
              document.body.style.display = 'none';
              document.body.offsetHeight;
              document.body.style.display = '';
              
              // Force transform reset
              document.documentElement.style.webkitTransform = '';
              document.documentElement.style.transform = '';
              
              // Final visibility check
              if (document.body) {
                document.body.style.visibility = 'visible';
                document.body.style.opacity = '1';
              }
              
              const appRoot = document.getElementById('root');
              if (appRoot) {
                appRoot.style.visibility = 'visible';
                appRoot.style.opacity = '1';
              }
            `).catch(() => {});
          }
        }, 300);
        
        // Emergency repaint if still white
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              // Emergency white screen detection and fix
              const body = document.body;
              const computedStyle = window.getComputedStyle(body);
              if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || 
                  computedStyle.backgroundColor === 'transparent' ||
                  body.style.display === 'none' ||
                  body.style.visibility === 'hidden') {
                
                body.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff';
                body.style.visibility = 'visible';
                body.style.opacity = '1';
                body.style.display = '';
                
                // Force immediate repaint
                body.style.transform = 'translateZ(0)';
                setTimeout(() => body.style.transform = '', 10);
              }
            `).catch(() => {});
          }
        }, 1000);
      }
    }
  });
  
  // Windows-specific fix for DOM ready
  if (process.platform === 'win32') {
    mainWindow.webContents.on('dom-ready', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          // Ensure body is visible
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.opacity = '1';
          }
          
          // Force hardware acceleration reset
          document.documentElement.style.transform = 'translateZ(0)';
          setTimeout(() => {
            document.documentElement.style.transform = '';
          }, 50);
        `).catch(err => console.log('DOM ready script failed:', err));
      }
    });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
  
  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const appIcon = getAppIcon();
    if (appIcon) {
      app.dock.setIcon(appIcon);
    }
  }
}

function getAppIcon() {
  // Try different icon formats based on platform, prioritizing the new foxicon files
  const iconPaths = [
    path.join(__dirname, 'foxicon-1024.png'), // Ultra high-res fox icon (1024x1024, perfect for all platforms)
    path.join(__dirname, 'foxicon-512.png'),  // High-res fox icon (512x512, macOS compatible)
    path.join(__dirname, 'foxicon.ico'),      // Windows ICO format fox icon
    path.join(__dirname, 'foxicon.svg'),      // SVG format fox icon
    path.join(__dirname, 'icon.ico'),         // Fallback icon (Windows format)
    path.join(__dirname, 'icon-512.png'),     // Fallback high-res PNG
    path.join(__dirname, 'Fuchs.svg'),        // TaskFuchs logo SVG
    path.join(__dirname, 'taskfuchs.png'),    // Fallback PNG
    path.join(__dirname, 'fuchs.png'),        // PNG version of Fuchs
    path.join(__dirname, 'Fuchs.png'),        // PNG version of Fuchs (capitalized)
    path.join(__dirname, 'fuchs.svg')         // SVG fallback (lowercase)
  ];
  
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      console.log('Using TaskFuchs icon:', iconPath);
      return iconPath;
    }
  }
  
  console.log('No TaskFuchs icon found, using default');
  return undefined; // No icon if not found
}

function getStartUrl() {
  if (isDev) {
    // Try different development ports
    const devPorts = [5173, 5174, 5175, 5176, 3000];
    for (const port of devPorts) {
      console.log(`Trying dev server on port ${port}`);
      return `http://localhost:${port}`;
    }
    return 'http://localhost:5173'; // Default
  } else {
    // Production build - handle different packaging scenarios
    let indexPath;
    
    // Check if we're in an ASAR package
    if (process.resourcesPath) {
      indexPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
    } else {
      indexPath = path.join(__dirname, '../dist/index.html');
    }
    
    console.log('Production index path:', indexPath);
    console.log('Index path exists:', fs.existsSync(indexPath));
    
    // Fallback paths if main path doesn't exist
    if (!fs.existsSync(indexPath)) {
      const fallbackPaths = [
        path.join(__dirname, 'dist', 'index.html'),
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(app.getAppPath(), 'dist', 'index.html')
      ];
      
      for (const fallbackPath of fallbackPaths) {
        console.log('Trying fallback path:', fallbackPath);
        if (fs.existsSync(fallbackPath)) {
          indexPath = fallbackPath;
          console.log('Using fallback path:', indexPath);
          break;
        }
      }
    }
    
    return `file://${indexPath}`;
  }
}

function createMenu() {
  const template = [
    {
      label: 'TaskFuchs',
      submenu: [
        {
          label: 'Über TaskFuchs',
          click: () => {
            // Could show an about dialog
          }
        },
        { type: 'separator' },
        {
          label: 'Einstellungen',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // Could send IPC message to show settings
            if (mainWindow) {
              mainWindow.webContents.send('show-settings');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'TaskFuchs beenden',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { label: 'Rückgängig', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Wiederholen', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Ausschneiden', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Kopieren', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Einfügen', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Alles auswählen', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { label: 'Neu laden', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Entwicklertools', accelerator: 'F12', role: 'toggledevtools' },
        { type: 'separator' },
        { label: 'Vollbild', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Vergrößern', accelerator: 'CmdOrCtrl+Plus', role: 'zoomin' },
        { label: 'Verkleinern', accelerator: 'CmdOrCtrl+-', role: 'zoomout' },
        { label: 'Zurücksetzen', accelerator: 'CmdOrCtrl+0', role: 'resetzoom' }
      ]
    },
    {
      label: 'Fenster',
      submenu: [
        { label: 'Minimieren', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Schließen', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'TaskFuchs Website',
          click: () => {
            shell.openExternal('https://taskfuchs.de');
          }
        },
        {
          label: 'Dokumentation',
          click: () => {
            shell.openExternal('https://docs.taskfuchs.de');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template[0].submenu.unshift(
      {
        label: 'Über TaskFuchs',
        role: 'about'
      },
      { type: 'separator' }
    );

    // Window menu
    template[3].submenu = [
      { label: 'Schließen', accelerator: 'CmdOrCtrl+W', role: 'close' },
      { label: 'Minimieren', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
      { label: 'Zoom', role: 'zoom' },
      { type: 'separator' },
      { label: 'Alle Fenster in den Vordergrund', role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Performance flags for Electron
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-features', 'TranslateUI');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--max_old_space_size', '4096');

// Enhanced error handling and logging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Try to write to a log file for debugging
  try {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Uncaught Exception: ${error.stack}\n`);
  } catch (e) {
    console.error('Failed to write error log:', e);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Try to write to a log file for debugging
  try {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\n`);
  } catch (e) {
    console.error('Failed to write error log:', e);
  }
});

// Add additional error handling for the main window
function handleWindowError(error) {
  console.error('Window error:', error);
  try {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Window Error: ${error}\n`);
  } catch (e) {
    console.error('Failed to write error log:', e);
  }
}

// App event listeners with better error handling
app.whenReady().then(() => {
  console.log('Electron app is ready');
  console.log('App path:', app.getAppPath());
  console.log('User data path:', app.getPath('userData'));
  createWindow();
}).catch(err => {
  console.error('Error during app ready:', err);
  handleWindowError(`Error during app ready: ${err.message}`);
});

app.on('window-all-closed', () => {
  // On macOS keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers (for future use)
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-quit', () => {
  app.quit();
});

// Notification handlers
ipcMain.on('show-notification', (event, options) => {
  try {
    // Check if notifications are supported
    if (!Notification.isSupported()) {
      console.warn('Notifications are not supported on this system');
      return;
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon ? path.join(__dirname, options.icon) : undefined,
      silent: options.silent || false,
      urgency: options.requireInteraction ? 'critical' : 'normal',
      tag: options.tag
    });

    // Handle notification click
    notification.on('click', () => {
      // Focus the main window
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
      }
      
      // Send click event back to renderer
      if (options.tag) {
        event.sender.send(`notification-click-${options.tag}`);
      }
    });

    // Handle notification close
    notification.on('close', () => {
      // Send close event back to renderer if needed
      if (options.tag) {
        event.sender.send(`notification-close-${options.tag}`);
      }
    });

    // Show the notification
    notification.show();
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Request notification permission (for consistency with web)
ipcMain.handle('request-notification-permission', () => {
  return Notification.isSupported() ? 'granted' : 'denied';
});

// Timer Window Functions
function createTimerWindow() {
  if (timerWindow) {
    timerWindow.focus();
    return;
  }

  timerWindow = new BrowserWindow({
    width: 300,
    height: 350,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  const timerHtmlPath = isDev
    ? path.join(__dirname, 'timer-window.html')
    : path.join(__dirname, 'timer-window.html');

  timerWindow.loadFile(timerHtmlPath);

  timerWindow.on('closed', () => {
    timerWindow = null;
  });
}

function closeTimerWindow() {
  if (timerWindow) {
    timerWindow.close();
    timerWindow = null;
  }
}

// Timer Window IPC Handlers
ipcMain.on('open-timer-window', (event, data) => {
  createTimerWindow();
  if (timerWindow) {
    timerWindow.webContents.send('timer-update', data);
  }
});

ipcMain.on('close-timer-window', () => {
  closeTimerWindow();
});

ipcMain.on('timer-request-data', (event) => {
  // Timer window requests initial data
  if (mainWindow) {
    mainWindow.webContents.send('timer-data-request');
  }
});

ipcMain.on('timer-action', (event, action) => {
  // Forward timer actions to main window
  if (mainWindow) {
    mainWindow.webContents.send('timer-action', action);
  }
});

// Debug information
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);
console.log('Platform:', process.platform);
console.log('Is development:', isDev);
console.log('Notifications supported:', Notification.isSupported()); 