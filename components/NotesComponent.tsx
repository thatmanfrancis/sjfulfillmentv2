"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { post, put, del } from "@/lib/api";

interface NoteAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: NoteAuthor;
}

interface NotesComponentProps {
  notes: Note[];
  orderId?: string;
  shipmentId?: string;
  currentUserId: string;
  userRole: string;
  onNoteAdded?: () => void;
  onNoteUpdated?: () => void;
  onNoteDeleted?: () => void;
}

export function NotesComponent({
  notes,
  orderId,
  shipmentId,
  currentUserId,
  userRole,
  onNoteAdded,
  onNoteUpdated,
  onNoteDeleted,
}: NotesComponentProps) {
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

  return (
    <div className="space-y-4">
      {/* Add New Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Enter your note here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleAddNote}
            disabled={isAddingNote || !newNoteContent.trim()}
            style={{ backgroundColor: "#f08c017" }}
            className="text-white hover:opacity-90"
          >
            {isAddingNote ? "Adding..." : "Add Note"}
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Notes ({notes.length})</h3>
        {notes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No notes yet. Add one above to get started.
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="py-4">
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditNote(note.id)}
                        disabled={!editContent.trim()}
                        style={{ backgroundColor: "#f08c017" }}
                        className="text-white hover:opacity-90"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {note.author.firstName} {note.author.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(note.createdAt), "PPp")}
                          {note.updatedAt !== note.createdAt && (
                            <span className="ml-2">
                              (edited {format(new Date(note.updatedAt), "PPp")})
                            </span>
                          )}
                        </p>
                      </div>
                      {canEditOrDelete(note) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(note)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
