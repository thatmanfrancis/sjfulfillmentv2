"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, X, Check, MessageSquare } from "lucide-react";
import { post, put, del } from "@/lib/api";

interface NoteAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  Author?: NoteAuthor;
}

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  shipmentId?: string;
  notes?: Note[];
  currentUserId: string;
  userRole: string;
  onNoteAdded?: () => void;
  onNoteUpdated?: () => void;
  onNoteDeleted?: () => void;
}

export function NotesDrawer({
  isOpen,
  onClose,
  orderId,
  shipmentId,
  notes = [],
  currentUserId,
  userRole,
  onNoteAdded,
  onNoteUpdated,
  onNoteDeleted,
}: NotesDrawerProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Debug log
  console.log("NotesDrawer - notes:", notes, "count:", notes.length);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsAddingNote(true);
    try {
      await post("/api/notes", {
        content: newNoteContent,
        orderId,
        shipmentId,
      });

      setNewNoteContent("");
      onNoteAdded?.();
    } catch (error) {
      console.error("Error adding note:", error);
      alert(error instanceof Error ? error.message : "Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      await put(`/api/notes/${noteId}`, { content: editContent });

      setEditingNoteId(null);
      setEditContent("");
      onNoteUpdated?.();
    } catch (error) {
      console.error("Error updating note:", error);
      alert(error instanceof Error ? error.message : "Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await del(`/api/notes/${noteId}`);
      onNoteDeleted?.();
    } catch (error) {
      console.error("Error deleting note:", error);
      alert(error instanceof Error ? error.message : "Failed to delete note");
    }
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const canEditOrDelete = (note: Note) => {
    return note.authorId === currentUserId || userRole === "ADMIN";
  };

  // Get unique authors for avatar display
  const uniqueAuthors = Array.from(
    new Map(
      notes
        .filter((note) => note.Author) // Filter out notes without Author data
        .map((note) => [note.authorId, note.Author!])
    ).values()
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-[#1a1a1a] border-l border-[#f8c017]/20 overflow-y-auto">
        <SheetHeader className="px-6">
          <SheetTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#f8c017]" />
            Order Notes
            {notes && notes.length > 0 && (
              <span className="ml-2 bg-[#f8c017] text-black text-xs font-bold rounded-full px-2 py-0.5">
                {notes.length}
              </span>
            )}
          </SheetTitle>
          {/* Author Avatars */}
          {uniqueAuthors.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Contributors:</span>
              <TooltipProvider>
                <div className="flex -space-x-2">
                  {uniqueAuthors.map((author, index) => (
                    <Tooltip key={author.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-6 h-6 rounded-full bg-[#f8c017] text-black flex items-center justify-center text-[10px] font-bold border-2 border-[#1a1a1a] cursor-pointer hover:scale-110 transition-transform"
                          style={{ zIndex: uniqueAuthors.length - index }}
                        >
                          {getInitials(author.firstName, author.lastName)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#232323] border-[#f8c017]/30">
                        <div className="text-sm">
                          <p className="font-semibold text-white">
                            {author.firstName} {author.lastName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {author.email}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6 px-6">
          {/* Add New Note Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Add New Note</h3>
            <Textarea
              placeholder="Type your note here..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              className="bg-[#232323] border-gray-600 text-white placeholder:text-gray-500 resize-none focus:border-[#f8c017] focus:ring-[#f8c017]"
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim() || isAddingNote}
              className="w-full bg-[#f8c017] text-black hover:bg-[#f8c017]/90 font-semibold"
            >
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </div>

          {/* Previous Notes Section */}
          {notes && notes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-white border-t border-[#f8c017]/20 pt-4">
                Previous Notes ({notes.length})
              </h3>

              <div className="space-y-4">
                {notes
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((note) => (
                    <div key={note.id} className="group">
                      {editingNoteId === note.id ? (
                        <div className="space-y-3 bg-[#232323]/50 rounded-lg p-3">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="bg-[#1a1a1a] border-gray-600 text-white resize-none focus:border-[#f8c017] focus:ring-[#f8c017]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditNote(note.id)}
                              disabled={!editContent.trim()}
                              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              className="border-gray-600 hover:bg-gray-800"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {/* Avatar */}
                          {note.Author && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-6 h-6 rounded-full bg-[#f8c017] text-black flex items-center justify-center text-[10px] font-bold shrink-0 cursor-pointer">
                                    {getInitials(
                                      note.Author.firstName,
                                      note.Author.lastName
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#232323] border-[#f8c017]/30">
                                  <div className="text-sm">
                                    <p className="font-semibold text-white">
                                      {note.Author.firstName}{" "}
                                      {note.Author.lastName}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      {note.Author.email}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Note Content */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-[#232323]/70 rounded-lg px-4 py-3 hover:bg-[#232323] transition-colors">
                              <p className="text-white text-sm whitespace-pre-wrap wrap-break-words">
                                {note.content}
                              </p>
                            </div>
                            {/* Timestamp and Actions */}
                            <div className="flex items-center justify-between mt-1 px-1">
                              <p className="text-xs text-gray-500">
                                {format(
                                  new Date(note.createdAt),
                                  "MMM d, h:mm a"
                                )}
                                {note.updatedAt !== note.createdAt && (
                                  <span className="ml-1">(edited)</span>
                                )}
                              </p>
                              {canEditOrDelete(note) && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => startEdit(note)}
                                    className="p-1 hover:bg-[#f8c017]/20 rounded transition-colors"
                                    title="Edit note"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-[#f8c017]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {notes && notes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notes yet. Add your first note above.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
