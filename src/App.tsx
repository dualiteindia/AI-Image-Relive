import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Film,
  Loader2,
  Sparkles,
  History,
  Settings,
  AlertCircle,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { cn, fileToBase64 } from "./lib/utils";
import { generateMemoryVideo } from "./api/higgsfield";
import { Button } from "./components/ui/Button";
import { SettingsModal } from "./components/SettingsModal";
import { useApiKeys } from "./hooks/useApiKeys";

type InputMethod = "upload" | "url";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>("url");
  const [urlInput, setUrlInput] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>(""); // New state for granular status
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { apiKey, apiSecret, saveKeys, hasKeys } = useApiKeys();
  const resultRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      const base64 = await fileToBase64(selectedFile);
      setPreview(base64);
      setGeneratedVideo(null);
      setError(null);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: any[]) => {
    const rejection = fileRejections[0];
    if (rejection) {
      const { errors } = rejection;
      if (errors[0]?.code === "file-too-large") {
        setError("File is too large. Max size is 1MB.");
      } else if (errors[0]?.code === "file-invalid-type") {
        setError("Invalid file type. Only JPG, PNG, and WebP are allowed.");
      } else {
        setError(errors[0]?.message || "File upload failed.");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxSize: 1024 * 1024, // 1MB
    maxFiles: 1,
    disabled: inputMethod === "url" || !!preview,
  });

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    // Basic validation
    if (!urlInput.match(/^https?:\/\/.+/)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setPreview(urlInput);
    setFile(null);
    setGeneratedVideo(null);
    setError(null);
  };

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setGeneratedVideo(null);
    setError(null);
    setUrlInput("");
    setGenerationStatus("");
  };

  const handleGenerate = async () => {
    if (!preview) return;

    if (!hasKeys) {
      setIsSettingsOpen(true);
      setError("Please configure your API keys to continue.");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("Initializing...");
    setError(null);

    try {
      const response = await generateMemoryVideo({
        imageUrl: preview,
        apiKey,
        apiSecret,
        onStatusUpdate: (status) => {
          // Capitalize first letter for display
          const displayStatus =
            status.charAt(0).toUpperCase() + status.slice(1);
          setGenerationStatus(displayStatus);
        },
      });

      console.log("Final API Response:", response);

      // Check for output URL in various common fields based on docs
      // Docs say: response.video.url
      const videoUrl =
        response.video?.url ||
        response.output ||
        response.url ||
        (Array.isArray(response.output) ? response.output[0] : null);

      if (videoUrl) {
        setGeneratedVideo(videoUrl);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        setError(
          `Video generation completed but no URL found. Status: ${
            response?.status || "unknown"
          }. Check console.`
        );
      }
    } catch (err: any) {
      console.error(err);

      let errorMessage =
        "Failed to generate video. Please check your API keys and try again.";

      if (err.message.includes("Timed out")) {
        errorMessage =
          "The request timed out. The video is taking longer than 30 minutes to generate.";
      } else if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          const firstError = err.response.data.detail[0];
          const field = firstError.loc ? firstError.loc.join(".") : "field";
          errorMessage = `API Error: ${firstError.msg} (${field})`;
        } else {
          errorMessage = `API Error: ${JSON.stringify(
            err.response.data.detail
          )}`;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsSettingsOpen(true);
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] text-[#4A4A4A] font-sans selection:bg-[#D4C5A9] flex flex-col">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={saveKeys}
        initialKey={apiKey}
        initialSecret={apiSecret}
      />

      {/* Header */}
      <header className="py-6 px-4 border-b border-[#E6DCC8] bg-[#FDF6E3]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-[#8B5E3C]" />
            <h1 className="text-2xl font-serif font-bold text-[#2C2C2C] tracking-tight">
              Memory Lane
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="text-[#8B5E3C] hover:text-[#6F4B30] hover:bg-[#F4EBD9]"
            >
              <Settings className="w-4 h-4 mr-2" />
              {hasKeys ? "Configured" : "Setup API"}
            </Button>
            <div className="hidden sm:block text-xs font-medium text-[#8B5E3C] bg-[#F4EBD9] px-3 py-1 rounded-full border border-[#E6DCC8]">
              Powered by Higgsfield AI
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-grow flex flex-col justify-center w-full max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Intro */}
        <section className="text-center space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif text-[#2C2C2C] leading-tight"
          >
            Bring your old photos <br /> back to life.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-[#6B6B6B] max-w-xl mx-auto"
          >
            Upload a cherished static memory or paste a link, and watch it
            gently move again.
          </motion.p>
        </section>

        {/* Input Section */}
        <section className="space-y-6">
          {/* Input Method Tabs */}
          {!preview && (
            <div className="flex justify-center mb-4">
              <div className="bg-[#F4EBD9] p-1 rounded-lg border border-[#E6DCC8] flex gap-1">
                <button
                  onClick={() => setInputMethod("url")}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                    inputMethod === "url"
                      ? "bg-white text-[#8B5E3C] shadow-sm"
                      : "text-[#8B8B8B] hover:text-[#6F4B30]"
                  )}
                >
                  <LinkIcon className="w-4 h-4" />
                  Image URL
                </button>
                <button
                  disabled
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 opacity-50 cursor-not-allowed",
                    inputMethod === "upload"
                      ? "bg-white text-[#8B5E3C] shadow-sm"
                      : "text-[#8B8B8B]"
                  )}
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                  <span className="ml-1 text-[10px] bg-[#E6DCC8] text-[#8B5E3C] px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            <AnimatePresence mode="wait">
              {!preview ? (
                inputMethod === "upload" ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    {...getRootProps()}
                    className={cn(
                      "relative group border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden text-center",
                      isDragActive
                        ? "border-[#8B5E3C] bg-[#F4EBD9]"
                        : "border-[#D4C5A9] hover:border-[#8B5E3C] hover:bg-[#F9F3E5]"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 bg-[#F4EBD9] rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <ImageIcon className="w-8 h-8 text-[#8B5E3C]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#2C2C2C] mb-1">
                      Upload an image
                    </h3>
                    <p className="text-sm text-[#8B8B8B]">
                      Drag & drop or click to select (JPG, PNG, WebP) - Max 1MB
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-2 border-dashed border-[#D4C5A9] rounded-xl p-12 bg-[#FDF6E3] flex flex-col items-center gap-4"
                  >
                    <div className="w-full max-w-md space-y-3">
                      <label className="block text-sm font-medium text-[#4A4A4A] text-center">
                        Paste Image URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          className="flex-1 px-4 py-2 bg-white border border-[#D4C5A9] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUrlSubmit()
                          }
                        />
                        <Button onClick={handleUrlSubmit} variant="vintage">
                          Load
                        </Button>
                      </div>
                      <p className="text-xs text-[#8B8B8B] text-center">
                        Ensure the URL is publicly accessible.
                      </p>
                    </div>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="preview-image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative flex flex-col items-center"
                >
                  <div className="relative group">
                    <div className="relative rounded-lg overflow-hidden shadow-md border-[6px] border-white bg-white rotate-1 max-h-[400px]">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-w-full h-auto object-contain max-h-[400px]"
                        onError={() =>
                          setError(
                            "Could not load image from URL. Please check the link."
                          )
                        }
                      />
                    </div>
                    <button
                      onClick={clearAll}
                      className="absolute -top-4 -right-4 bg-white text-red-500 rounded-full p-2 shadow-md hover:bg-red-50 transition-colors border border-red-100"
                      title="Remove image"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-6 text-sm text-[#8B8B8B] italic">
                    Ready to relive this memory?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              variant="vintage"
              disabled={!preview || isGenerating}
              onClick={(e) => {
                e.stopPropagation();
                handleGenerate();
              }}
              className="w-full sm:w-auto min-w-[200px] text-base shadow-lg hover:shadow-xl transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {generationStatus
                    ? `Dreaming... (${generationStatus})`
                    : "Dreaming..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Relive Memory
                </>
              )}
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </section>

        {/* Result Section */}
        <AnimatePresence>
          {generatedVideo && (
            <motion.section
              ref={resultRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="pt-8 border-t border-[#E6DCC8]"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-serif text-[#2C2C2C] mb-2">
                  Your Living Memory
                </h3>
                <p className="text-[#6B6B6B]">The moment, captured in time.</p>
              </div>

              <div className="relative max-w-2xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl border-[8px] border-white">
                <video
                  src={generatedVideo}
                  controls
                  autoPlay
                  loop
                  className="w-full h-auto"
                />
              </div>

              <div className="mt-6 flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(generatedVideo, "_blank")}
                >
                  <Film className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
                <Button variant="ghost" onClick={clearAll}>
                  Create Another
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[#8B8B8B] text-sm border-t border-[#E6DCC8] bg-[#FDF6E3]">
        <p>
          © {new Date().getFullYear()} Memory Lane. Preserving moments forever.
          Made in{" "}
          <a
            href="https://dualite.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8B5E3C] hover:text-[#6F4B30]"
          >
            Dualite
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
