using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace Bentian.Tray
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip contextMenu;
        private static int port = 39281;
        private static int parentPid = -1;
        private static string cloudUrl = "https://bridge.cristianjm.com/dashboard/";
        private static System.Windows.Forms.Timer watchdogTimer;
        private static System.Windows.Forms.Timer statusPollTimer;

        [STAThread]
        static void Main(string[] args)
        {
            // Parse arguments
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--port" && i + 1 < args.Length)
                {
                    int.TryParse(args[i + 1], out port);
                }
                else if (args[i] == "--parent-pid" && i + 1 < args.Length)
                {
                    int.TryParse(args[i + 1], out parentPid);
                }
                else if (args[i] == "--cloud-url" && i + 1 < args.Length)
                {
                    cloudUrl = args[i + 1];
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Create context menu
            contextMenu = new ContextMenuStrip();
            contextMenu.ShowImageMargin = false;

            var openItem = new ToolStripMenuItem("🖥️  Abrir Centro de Control");
            openItem.Font = new Font(openItem.Font, FontStyle.Bold);
            openItem.Click += (s, e) => OpenControlCenter();
            contextMenu.Items.Add(openItem);

            var syncItem = new ToolStripMenuItem("⚡  Forzar Sincronización Ahora");
            syncItem.Click += (s, e) => TriggerSync();
            contextMenu.Items.Add(syncItem);

            var logsItem = new ToolStripMenuItem("📋  Ver Registro de Actividad");
            logsItem.Click += (s, e) => OpenLogs();
            contextMenu.Items.Add(logsItem);

            contextMenu.Items.Add(new ToolStripSeparator());

            var portalItem = new ToolStripMenuItem("🌐  Portal Web de Licencias");
            portalItem.Click += (s, e) => OpenWebPortal();
            contextMenu.Items.Add(portalItem);

            contextMenu.Items.Add(new ToolStripSeparator());

            var exitItem = new ToolStripMenuItem("❌  Salir de Bentian Agent");
            exitItem.Click += (s, e) => ExitAgent();
            contextMenu.Items.Add(exitItem);

            // Initialize NotifyIcon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Bentian ERP Bridge — Activo";

            // Try to extract embedded icon from the executable
            try
            {
                trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.ContextMenuStrip = contextMenu;
            trayIcon.Visible = true;

            // Click handlers: Left-click or Double-click opens Control Center
            trayIcon.DoubleClick += (s, e) => OpenControlCenter();
            trayIcon.MouseClick += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    OpenControlCenter();
                }
            };

            // Watchdog timer: monitors parent PID so we don't leave orphaned tray icons
            if (parentPid > 0)
            {
                watchdogTimer = new System.Windows.Forms.Timer();
                watchdogTimer.Interval = 2000;
                watchdogTimer.Tick += (s, e) =>
                {
                    try
                    {
                        var parent = Process.GetProcessById(parentPid);
                        if (parent.HasExited)
                        {
                            ExitCleanly();
                        }
                    }
                    catch
                    {
                        ExitCleanly();
                    }
                };
                watchdogTimer.Start();
            }

            // Periodic status polling to update tooltip text
            statusPollTimer = new System.Windows.Forms.Timer();
            statusPollTimer.Interval = 10000;
            statusPollTimer.Tick += (s, e) => PollAgentStatus();
            statusPollTimer.Start();

            // Initial balloon tip
            try
            {
                trayIcon.ShowBalloonTip(
                    2500,
                    "Bentian ERP Bridge",
                    "El agente está sincronizando en segundo plano.\nHaga doble clic aquí para abrir el panel.",
                    ToolTipIcon.Info
                );
            }
            catch { }

            Application.Run();
        }

        private static void OpenControlCenter()
        {
            try
            {
                string url = "http://127.0.0.1:" + port + "/api/local/open-window";
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 2000;
                req.GetResponse().Close();
            }
            catch
            {
                // Fallback: direct browser launch
                try
                {
                    Process.Start(new ProcessStartInfo("http://127.0.0.1:" + port) { UseShellExecute = true });
                }
                catch { }
            }
        }

        private static void OpenLogs()
        {
            try
            {
                Process.Start(new ProcessStartInfo("http://127.0.0.1:" + port + "#logs") { UseShellExecute = true });
            }
            catch { }
        }

        private static void OpenWebPortal()
        {
            try
            {
                Process.Start(new ProcessStartInfo(cloudUrl) { UseShellExecute = true });
            }
            catch { }
        }

        private static void TriggerSync()
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    trayIcon.ShowBalloonTip(2000, "Bentian ERP Bridge", "Iniciando sincronización...", ToolTipIcon.Info);
                    string url = "http://127.0.0.1:" + port + "/api/local/sync-now";
                    var req = (HttpWebRequest)WebRequest.Create(url);
                    req.Method = "POST";
                    req.ContentLength = 0;
                    req.Timeout = 30000;
                    using (var resp = req.GetResponse())
                    {
                        trayIcon.ShowBalloonTip(3000, "Bentian ERP Bridge", "✓ Sincronización completada con éxito.", ToolTipIcon.Info);
                    }
                }
                catch (Exception ex)
                {
                    trayIcon.ShowBalloonTip(3500, "Bentian ERP Bridge", "Error en sincronización: " + ex.Message, ToolTipIcon.Warning);
                }
            });
        }

        private static void PollAgentStatus()
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    string url = "http://127.0.0.1:" + port + "/api/local/status";
                    var req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 3000;
                    using (var resp = req.GetResponse())
                    using (var reader = new StreamReader(resp.GetResponseStream()))
                    {
                        string json = reader.ReadToEnd();
                        // Truncate tooltip safely (Windows limit: 63 characters)
                        string tip = "Bentian ERP Bridge — Conectado";
                        if (json.Contains("\"licenseStatus\":\"ACTIVE\"") || json.Contains("\"licenseStatus\":\"GRACE_PERIOD\""))
                        {
                            tip = "Bentian ERP Bridge — Sincronizando OK";
                        }
                        if (trayIcon != null)
                        {
                            trayIcon.Text = tip.Length > 63 ? tip.Substring(0, 63) : tip;
                        }
                    }
                }
                catch { }
            });
        }

        private static void ExitAgent()
        {
            try
            {
                string url = "http://127.0.0.1:" + port + "/api/local/shutdown";
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "POST";
                req.ContentLength = 0;
                req.Timeout = 2000;
                req.GetResponse().Close();
            }
            catch { }

            // If parent process is still alive after 1 second, terminate it
            if (parentPid > 0)
            {
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    Thread.Sleep(1000);
                    try
                    {
                        var parent = Process.GetProcessById(parentPid);
                        if (!parent.HasExited)
                        {
                            parent.Kill();
                        }
                    }
                    catch { }
                });
            }

            ExitCleanly();
        }

        private static void ExitCleanly()
        {
            if (watchdogTimer != null) watchdogTimer.Stop();
            if (statusPollTimer != null) statusPollTimer.Stop();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            Application.Exit();
        }
    }
}
