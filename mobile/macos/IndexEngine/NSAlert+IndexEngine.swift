import AppKit

/// Small, explicit wrappers so the WebKit UI delegate never has to build alerts inline.
extension NSAlert {

    static func present(message: String, informativeText: String = "", style: NSAlert.Style = .informational) {
        let alert = NSAlert()
        alert.alertStyle = style
        alert.messageText = message
        alert.informativeText = informativeText
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    static func present(error: Error, title: String = "The operation could not be completed.") {
        present(message: title, informativeText: error.localizedDescription, style: .warning)
    }

    /// Returns `true` only when the operator accepts.
    static func confirm(_ message: String) -> Bool {
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = message
        alert.addButton(withTitle: "Continue")
        alert.addButton(withTitle: "Cancel")
        return alert.runModal() == .alertFirstButtonReturn
    }

    /// Returns `nil` when the operator cancels.
    static func textInput(prompt: String, defaultText: String?) -> String? {
        let alert = NSAlert()
        alert.alertStyle = .informational
        alert.messageText = prompt
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")

        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 440, height: 24))
        field.stringValue = defaultText ?? ""
        alert.accessoryView = field
        alert.window.initialFirstResponder = field

        guard alert.runModal() == .alertFirstButtonReturn else { return nil }
        return field.stringValue
    }
}
