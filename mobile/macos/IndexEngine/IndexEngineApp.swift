import SwiftUI

/// Native macOS shell for the EFNAI V9.1.0.1 engine.
///
/// This app wraps the canonical single-file SPA at `v9/index.html`. It does not
/// re-implement nomenclature policy: there is exactly one engine, bundled as a
/// local web asset. See `docs/GUIDE-MACOS.md`.
@main
struct IndexEngineApp: App {

    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = BrowserModel()

    var body: some Scene {
        WindowGroup("Index Engine") {
            ContentView(model: model)
                .frame(minWidth: 1000, minHeight: 680)
        }
        .defaultSize(width: 1480, height: 980)
        .commands {
            // A single-window document app has no "New" concept to offer.
            CommandGroup(replacing: .newItem) { }
            CommandGroup(after: .toolbar) {
                Button("Reload Engine") {
                    NotificationCenter.default.post(name: .indexEngineReloadPage, object: nil)
                }
                .keyboardShortcut("r", modifiers: .command)
            }
        }
    }
}
