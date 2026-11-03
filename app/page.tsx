
"use client";

import { useState, useEffect } from "react";
import type { Post, Comment } from "./types";
import { supabase } from "./lib/supabase";
import PostCard from "./components/PostCard";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Obtener sesión del usuario
  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error al obtener sesión:", error);
        return;
      }

      if (mounted) {
        setCurrentUserId(data.session?.user?.id ?? null);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setCurrentUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Dar o quitar like
  const handleLike = async (postId: number | string) => {
    if (!currentUserId) {
      console.error("Debes iniciar sesión para dar like.");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.isLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("post_id", postId);

      if (error) {
        console.error("Error al quitar like:", error);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: false,
                likes_count: Math.max(0, (p.likes_count ?? 0) - 1),
              }
            : p
        )
      );
    } else {
      const { error } = await supabase.from("likes").insert({
        user_id: currentUserId,
        post_id: postId,
      });

      if (error) {
        console.error("Error al guardar like:", error);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: true,
                likes_count: (p.likes_count ?? 0) + 1,
              }
            : p
        )
      );
    }
  };

  // Agregar comentario
  const handleComment = async (
    postId: number | string,
    body: string
  ) => {
    if (!currentUserId || !body.trim()) return;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: currentUserId,
        post_id: postId,
        body: body.trim(),
      })
      .select("id, user_id, post_id, body, created_at")
      .single();

    if (error || !data) {
      console.error("Error al publicar comentario:", error);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (profileError) {
      console.error("Error al obtener perfil:", profileError);
    }

    const newComment: Comment = {
      ...data,
      profile: profileData || undefined,
    };

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [...(p.comments || []), newComment],
            }
          : p
      )
    );
  };

  // Cargar publicaciones
  useEffect(() => {
    const fetchPosts = async () => {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Error al obtener posts:", postsError);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = postsData.map((p) => p.id);
      const userIds = [
        ...new Set(postsData.map((p) => p.user_id).filter(Boolean)),
      ];

      // Obtener perfiles mediante user_id
      let profilesMap = new Map();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, username, avatar_url")
          .in("user_id", userIds);

        if (profilesError) {
          console.error("Error al obtener perfiles:", profilesError);
        }

        profilesMap = new Map(
          (profilesData || []).map((p) => [
            p.user_id,
            {
              username: p.username,
              avatar_url: p.avatar_url,
            },
          ])
        );
      }

      // Contar likes
      const { data: likesCountData, error: likesError } = await supabase
        .from("likes")
        .select("post_id")
        .in("post_id", postIds);

      if (likesError) {
        console.error("Error al contar likes:", likesError);
      }

      const likesCountMap = new Map<string | number, number>();

      likesCountData?.forEach((like) => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
      });

      // Obtener likes del usuario
      let userLikesSet = new Set<string | number>();

      if (currentUserId) {
        const { data: userLikesData, error: userLikesError } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds);

        if (userLikesError) {
          console.error("Error al obtener likes del usuario:", userLikesError);
        }

        userLikesSet = new Set(
          userLikesData?.map((like) => like.post_id) || []
        );
      }

      // Obtener comentarios
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, user_id, post_id, body, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Error al obtener comentarios:", commentsError);
      }

      // Obtener perfiles de los comentaristas
      const commenterIds = [
        ...new Set(commentsData?.map((c) => c.user_id).filter(Boolean) || []),
      ];

      let commenterProfilesMap = new Map();

      if (commenterIds.length > 0) {
        const { data: commenterProfiles, error: commenterError } =
          await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .in("user_id", commenterIds);

        if (commenterError) {
          console.error(
            "Error al obtener perfiles de comentaristas:",
            commenterError
          );
        }

        commenterProfilesMap = new Map(
          (commenterProfiles || []).map((p) => [
            p.user_id,
            {
              username: p.username,
              avatar_url: p.avatar_url,
            },
          ])
        );
      }

      // Agrupar comentarios
      const commentsMap = new Map<string | number, Comment[]>();

      commentsData?.forEach((comment) => {
        const postComments = commentsMap.get(comment.post_id) || [];

        postComments.push({
          ...comment,
          profile: commenterProfilesMap.get(comment.user_id),
        });

        commentsMap.set(comment.post_id, postComments);
      });

      // Unir información
      const postsWithData: Post[] = postsData.map((post) => ({
        ...post,
        profile: profilesMap.get(post.user_id),
        likes_count: likesCountMap.get(post.id) || 0,
        isLiked: userLikesSet.has(post.id),
        comments: commentsMap.get(post.id) || [],
      }));

      setPosts(postsWithData);
    };

    fetchPosts();
  }, [currentUserId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Supagram
          </h1>
        </div>
      </header>

      {/* Feed de publicaciones */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onLike={handleLike}
                onComment={handleComment}
              />
            ))
          ) : (
            <div className="text-center py-12 text-foreground/50">
              No hay publicaciones todavía.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
