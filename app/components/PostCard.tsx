import { supabase } from "../lib/supabase";
import { getTimeAgo } from "../utils/time";
import HeartIcon from "./HeartIcon";
import { Post } from "../types";

export default function PostCard({
  post,
  onLike,
}: {
  post: Post;
  onLike: (id: number | string) => void;
}) {
  const imageUrl = post.image_url?.startsWith("http")
    ? post.image_url
    : supabase.storage
        .from("supagram")
        .getPublicUrl(post.image_url).data.publicUrl;

  return (
    <article className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Usuario */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary">
          <img
            src={post.user?.avatar || "https://i.pravatar.cc/150?img=8"}
            alt={post.user?.username || "default user"}
            className="w-full h-full object-cover"
          />

        </div>

        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {post.user?.username || "default user"}
          </span>

          <span className="text-xs text-foreground/50">
            {getTimeAgo(new Date(post.created_at))}
          </span>
        </div>
      </div>

      {/* Imagen */}
      <div className="relative w-full aspect-square bg-gray-100 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Post de ${post.user?.username || "default user"}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error("No se pudo cargar:", imageUrl);

              e.currentTarget.style.display = "none";

              const parent = e.currentTarget.parentElement;

              if (parent) {
                const message = document.createElement("span");
                message.textContent = "Imagen no disponible";
                message.className = "text-gray-400 text-sm";
                parent.appendChild(message);
              }
            }}
          />
        ) : (
          <span className="text-gray-400 text-sm">
            Imagen no disponible
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLike(post.id)}
            className="hover:scale-110 transition-transform active:scale-95"
            aria-label={post.isLiked ? "Quitar like" : "Dar like"}
          >
            <HeartIcon filled={post.isLiked} />
          </button>

          <span className="font-semibold text-foreground">
            {post.likes.toLocaleString()} likes
          </span>
        </div>

        {/* Caption */}
        <p className="mt-2 text-foreground">
          <span className="font-semibold">
            {post.user?.username || "default user"}
          </span>{" "}

          <span className="text-foreground/80">
            {post.caption}
          </span>
        </p>
      </div>
    </article>
  );
}