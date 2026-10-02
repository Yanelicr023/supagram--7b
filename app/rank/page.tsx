"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";

type Post = {
  id: number | string;
  image_url: string;
  likes: number;
  caption: string | null;
};

export default function RankPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getRank() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("posts")
        .select("id, image_url, likes, caption")
        .order("likes", { ascending: false });

      if (error) {
        console.error("Error al cargar ranking:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setPosts((data || []) as Post[]);
      setLoading(false);
    }

    getRank();
  }, []);

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) {
      return "";
    }

    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://")
    ) {
      return imageUrl;
    }

    return supabase.storage
      .from("supagram")
      .getPublicUrl(imageUrl)
      .data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Ranking
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-10 text-foreground">
            Cargando ranking...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-xl">
            <p className="font-semibold">
              Error al cargar el ranking:
            </p>

            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-10 text-foreground">
            No hay publicaciones todavía.
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post.image_url);

              return (
                <div
                  key={post.id}
                  className="relative aspect-square overflow-hidden group rounded-xl bg-card-bg border border-border"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`Post con ${post.likes} likes`}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/50">
                      Imagen no disponible
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent">
                    <span className="text-white font-semibold">
                      ❤️ {post.likes} likes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}