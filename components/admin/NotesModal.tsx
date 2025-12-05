"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface NotesModalProps {
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

export function NotesModal({
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
}: NotesModalProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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
      onClose();
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
        .filter((note) => note.Author)
        .map((note) => [note.authorId, note.Author!])
    ).values()
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-[#f8c017]/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#f8c017]" />
            Order Notes
          </DialogTitle>
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
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Previous Notes Section */}
          {notes && notes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  Previous Notes ({notes.length})
                </h3>
                <Badge
                  variant="outline"
                  className="border-[#f8c017]/20 text-[#f8c017]"
                >
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                </Badge>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {notes
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((note) => (
                    <Card
                      key={note.id}
                      className="bg-[#232323] border-[#f8c017]/10 hover:border-[#f8c017]/30 transition-colors"
                    >
                      <CardContent className="p-4">
                        {editingNoteId === note.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              className="bg-[#1a1a1a] border-gray-600 text-white resize-none"
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
                                className="border-gray-600"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                {note.Author && (
                                  <p className="text-sm font-medium text-[#f8c017]">
                                    {note.Author.firstName}{" "}
                                    {note.Author.lastName}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {format(new Date(note.createdAt), "PPp")}
                                  {note.updatedAt !== note.createdAt && (
                                    <span className="ml-2">
                                      (edited{" "}
                                      {format(new Date(note.updatedAt), "PPp")})
                                    </span>
                                  )}
                                </p>
                              </div>
                              {canEditOrDelete(note) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEdit(note)}
                                    className="p-1 text-gray-400 hover:text-[#f8c017] transition-colors"
                                    title="Edit note"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap mt-2">
                              {note.content}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {notes && notes.length > 0 && (
            <div className="border-t border-[#f8c017]/10"></div>
          )}

          {/* Add New Note Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Add Note</h3>
            <Textarea
              placeholder="Write your note here..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              className="bg-[#232323] border-gray-600 text-white resize-none focus:border-[#f8c017] focus:ring-[#f8c017]/20"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:border-gray-500"
              >
                Close
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={isAddingNote || !newNoteContent.trim()}
                className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
              >
                {isAddingNote ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
