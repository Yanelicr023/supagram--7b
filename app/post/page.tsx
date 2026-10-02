"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function CreatePage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setImageFile(file);

      const reader = new FileReader();

      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  // ==========================================
  // ELIMINAR IMAGEN
  // ==========================================
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // SUBIR IMAGEN Y CREAR POST
  // ==========================================
  const uploadAndCreatePost = async (file: File) => {
    // ==========================================
    // 1. CREAR NOMBRE ÚNICO
    // ==========================================
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `images/${fileName}`;

    console.log("📁 Bucket:", "supagram");
    console.log("📁 Ruta:", filePath);

    // ==========================================
    // 2. SUBIR IMAGEN
    // ==========================================
    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from("supagram")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

    console.log("📤 Resultado de subida:", uploadData);

    if (uploadError) {
      console.error("❌ ERROR AL SUBIR IMAGEN");
      console.error("Mensaje:", uploadError.message);
      console.error("Detalles:", uploadError);

      throw new Error(
        `Error al subir la imagen: ${uploadError.message}`
      );
    }

    // ==========================================
    // 3. OBTENER URL PÚBLICA
    // ==========================================
    const { data: urlData } = supabase.storage
      .from("supagram")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    console.log("📸 Imagen subida correctamente");
    console.log("🔗 URL:", publicUrl);

    // ==========================================
    // 4. OBTENER UN user_id EXISTENTE
    // ==========================================
    const { data: existingPost, error: userError } = await supabase
      .from("posts")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (userError) {
      console.error("❌ ERROR AL OBTENER user_id");
      console.error("Mensaje:", userError.message);

      throw new Error(
        `No se pudo obtener el usuario: ${userError.message}`
      );
    }

    if (!existingPost?.user_id) {
      throw new Error(
        "No existe ningún user_id disponible en la tabla posts."
      );
    }

    console.log("👤 user_id utilizado:", existingPost.user_id);

    // ==========================================
    // 5. CREAR POST
    // ==========================================
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: existingPost.user_id,
        image_url: publicUrl,
        caption: caption,
        likes: 0,
      })
      .select("*");

    // ==========================================
    // 6. COMPROBAR ERROR
    // ==========================================
    if (postError) {
      console.error("❌ ERROR AL CREAR EL POST");
      console.error("Mensaje:", postError.message);
      console.error("Detalles:", postError.details);
      console.error("Hint:", postError.hint);
      console.error("Código:", postError.code);

      throw new Error(
        `Supabase: ${postError.message}${
          postError.details
            ? ` | ${postError.details}`
            : ""
        }`
      );
    }

    console.log("🆕 POST CREADO:", postData);

    return {
      uploadedImageUrl: publicUrl,
      newPost: postData,
    };
  };

  // ==========================================
  // PUBLICAR
  // ==========================================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      setMessage({
        type: "error",
        text: "Por favor selecciona una imagen",
      });

      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await uploadAndCreatePost(imageFile);

      setMessage({
        type: "success",
        text: "¡Post creado exitosamente!",
      });

      setImageFile(null);
      setImagePreview(null);
      setCaption("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("❌ ERROR COMPLETO:", error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // INTERFAZ
  // ==========================================
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Crear Post
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* IMAGEN */}
          <div className="flex flex-col gap-2">
            {imagePreview ? (
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-card-bg border border-border">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  unoptimized
                  className="object-cover"
                />

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Eliminar imagen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center gap-3 aspect-square w-full rounded-xl border-2 border-dashed border-border bg-card-bg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-primary"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                    />
                  </svg>
                </div>

                <span className="text-foreground/60 text-sm">
                  Haz clic para seleccionar una imagen
                </span>
              </label>
            )}

            <input
              ref={fileInputRef}
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* DESCRIPCIÓN */}
          <div className="flex flex-col gap-2">
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escribe algo sobre tu foto..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-card-bg border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* MENSAJE */}
          {message && (
            <div
              className={`px-4 py-3 rounded-xl text-sm ${
                message.type === "success"
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={isLoading || !imageFile}
            className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>

                Publicando...
              </>
            ) : (
              "Publicar"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}