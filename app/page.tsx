"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import PostCard from "./components/PostCard";
import { Post } from "./types";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      getPosts();
    }

    async function getPosts() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else if (data) {
        setPosts(
          data.map((post) => ({
            ...post,
            likes: post.likes ?? 0,
            isLiked: false,
          })) as Post[]
        );
      }

      setLoading(false);
    }

    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Supagram
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading && <p>Cargando publicaciones...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && posts.length === 0 && <p>No hay publicaciones todavía.</p>}
        {!loading && !error && posts.length > 0 && (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onLike={() => {}} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
