import Foundation
import Vision

// Local OCR is a search aid, not verification. Preserve recognized strings,
// confidence and coordinates so finish times and Previous Best stay distinct.
// Usage: swift scripts/ocr-submission-images.swift paths.json output.jsonl
let paths = try JSONDecoder().decode([String].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
let output = CommandLine.arguments[2]
if !FileManager.default.fileExists(atPath: output) {
    FileManager.default.createFile(atPath: output, contents: nil)
}
let handle = try FileHandle(forWritingTo: URL(fileURLWithPath: output))
try handle.seekToEnd()
for path in paths {
    var result: [String: Any] = ["path": path, "reviewStatus": "unverified-ocr"]
    do {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        let handler = VNImageRequestHandler(url: URL(fileURLWithPath: path))
        try handler.perform([request])
        result["lines"] = (request.results ?? []).compactMap { observation -> [String: Any]? in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            let box = observation.boundingBox
            return ["text": candidate.string, "confidence": candidate.confidence,
                    "box": [box.origin.x, box.origin.y, box.size.width, box.size.height]]
        }
    } catch {
        result["error"] = error.localizedDescription
    }
    let bytes = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    try handle.write(contentsOf: bytes)
    try handle.write(contentsOf: Data("\n".utf8))
}
try handle.close()
