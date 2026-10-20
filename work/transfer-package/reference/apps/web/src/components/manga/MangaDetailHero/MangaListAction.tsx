"use client";

import { BookmarkPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AddToListModal,
  type AddToListManga,
} from "@/components/lists/AddToListModal";

export function MangaListAction({
  csrfToken,
  manga,
}: {
  readonly csrfToken: string | null;
  readonly manga: AddToListManga;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function openLists() {
    if (!csrfToken) {
      router.push("/login");
      return;
    }
    setIsOpen(true);
  }

  return (
    <>
      <button onClick={openLists} type="button">
        <BookmarkPlus aria-hidden="true" size={18} />
        Añadir a lista
      </button>
      {isOpen && csrfToken ? (
        <AddToListModal
          csrfToken={csrfToken}
          manga={manga}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
