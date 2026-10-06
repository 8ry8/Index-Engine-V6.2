import SwiftUI

struct ContentView: View {

    @ObservedObject var model: BrowserModel

    var body: some View {
        ZStack {
            WebBrowserView(model: model)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            switch model.phase {
            case .ready:
                EmptyView()
            case .starting:
                StartingView(message: model.detail)
            case .failed(let message):
                FailureView(message: message) { model.reload() }
            }
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct StartingView: View {
    let message: String

    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
            Text(message)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct FailureView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 34))
                .foregroundStyle(.yellow)
            Text("The local engine could not start")
                .font(.headline)
            Text(message)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .textSelection(.enabled)
                .frame(maxWidth: 560)
            Text("The ledger, review queue, and audit chain are unchanged. Reloading restarts the local server and reopens the bundled engine.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 560)
            Button("Reload Engine", action: retry)
                .keyboardShortcut(.defaultAction)
        }
        .padding(36)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}
