
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

import { supabase } from "../lib/supabase";
import Modal from "../components/Modal";
import type { Post } from "../types";
import { HeartIcon } from "../components/HeartIcon";

export default function RankPage() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      // Obtener publicaciones
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, image_url, caption, user_id, created_at")
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Error al obtener los posts:", postsError);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Obtener usuarios únicos
      const userIds = [
        ...new Set(postsData.map((p) => p.user_id)),
      ];

      // Buscar perfiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(
        (profilesData || []).map((p) => [
          p.id,
          {
            username: p.username,
            avatar_url: p.avatar_url,
          },
        ])
      );

      // Contar likes
      const postIds = postsData.map((p) => p.id);

      const { data: likesCountData } = await supabase
        .from("likes")
        .select("post_id")
        .in("post_id", postIds);

      const likesCountMap = new Map<string | number, number>();

      likesCountData?.forEach((like) => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
      });

      // Combinar información
      const postsWithData: Post[] = postsData.map((post) => ({
        id: post.id,
        user_id: post.user_id,
        image_url: post.image_url,
        caption: post.caption,
        created_at: post.created_at,
        profile: profilesMap.get(post.user_id),
        likes_count: likesCountMap.get(post.id) || 0,
        isLiked: false,
        comments: [],
      }));

      // Filtrar publicaciones con más de 5 likes
      const filteredPosts = postsWithData
        .filter((p) => p.likes_count > 5)
        .sort((a, b) => b.likes_count - a.likes_count);

      setPosts(filteredPosts);
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Ranking
          </h1>
        </div>
      </header>

      {/* Grid de publicaciones */}
      <main className="max-w-2xl mx-auto p-2">
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square overflow-hidden group"
              >
                <Image
                  src={post.image_url}
                  alt={`Post con ${post.likes_count} likes`}
                  fill
                  sizes="(max-width: 768px) 33vw, 200px"
                  className="object-cover transition-transform group-hover:scale-105"
                />

                {/* Likes al pasar el cursor */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <HeartIcon size="sm" />

                  <span className="text-white font-semibold">
                    {post.likes_count.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-foreground/50">
            Todavía no hay publicaciones con más de 5 likes.
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedPost && (
        <Modal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}

    </div>
  );
}
