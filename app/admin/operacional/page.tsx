"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================
// Types
// ============================================================

interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface TaskChecklist {
  id: string;
  taskId: string;
  name: string;
  items: string; // JSON
}

interface TaskAttachment {
  id: string;
  taskId: string;
  filename: string;
  url: string;
  type: string;
  createdAt: string;
}

interface TaskLabel {
  id: string;
  taskId: string;
  name: string;
  color: string;
}

interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  order: number;
  boardId: string;
  assignee: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  checklists: TaskChecklist[];
  attachments: TaskAttachment[];
  labels: TaskLabel[];
  _count: { comments: number };
}

interface BoardMember {
  id: string;
  employeeId: string;
  employee: { id: string; name: string };
}

interface Board {
  id: string;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
  members: BoardMember[];
}

interface Employee {
  id: string;
  name: string;
  active: boolean;
}

// ============================================================
// Constants & Helpers
// ============================================================

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
};

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#6b7280", "#C9A96E", "#14b8a6",
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getDueDateStatus(dateStr: string | null): "overdue" | "today" | "normal" | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "normal";
}

function parseChecklistItems(items: string): ChecklistItem[] {
  try {
    return JSON.parse(items);
  } catch {
    return [];
  }
}

function getChecklistProgress(checklists: TaskChecklist[]): { done: number; total: number } | null {
  if (checklists.length === 0) return null;
  let done = 0;
  let total = 0;
  for (const cl of checklists) {
    const items = parseChecklistItems(cl.items);
    total += items.length;
    done += items.filter((i) => i.checked).length;
  }
  if (total === 0) return null;
  return { done, total };
}

// ============================================================
// API helpers
// ============================================================

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// ============================================================
// Component
// ============================================================

export default function OperacionalPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [boards, setBoards] = useState<Board[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Board dialogs
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("#C9A96E");
  const [newBoardMemberIds, setNewBoardMemberIds] = useState<string[]>([]);

  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardColor, setEditBoardColor] = useState("");
  const [editBoardMemberIds, setEditBoardMemberIds] = useState<string[]>([]);

  // New task inline
  const [newTaskBoardId, setNewTaskBoardId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Task detail dialog
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [descDirty, setDescDirty] = useState(false);

  // Label add
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");

  // Checklist add
  const [newChecklistName, setNewChecklistName] = useState("");
  const [showAddChecklist, setShowAddChecklist] = useState(false);

  // Checklist item add (per checklist)
  const [addItemChecklistId, setAddItemChecklistId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  // Comment
  const [newComment, setNewComment] = useState("");

  // Drag state
  const dragTaskId = useRef<string | null>(null);
  const dragFromBoardId = useRef<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // Data fetching
  // ============================================================

  const userRole = (session?.user as { role?: string })?.role;
  const userEmployeeId = (session?.user as { employeeId?: string | null })?.employeeId;
  const isAdmin = userRole === "admin";

  const fetchBoards = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      // If employee (not admin), filter boards by their employeeId
      if (!isAdmin && userEmployeeId) {
        params.set("employeeId", userEmployeeId);
      }
      const url = `/api/tasks${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
      }
    } catch (err) {
      console.error("Erro ao carregar quadros:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userEmployeeId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees?active=true");
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Wait for session to load before fetching boards
    if (sessionStatus === "loading") return;
    fetchBoards();
    fetchEmployees();
  }, [fetchBoards, fetchEmployees, sessionStatus]);


  // ============================================================
  // Board CRUD
  // ============================================================

  async function createBoard() {
    if (!newBoardName.trim()) return;
    await api("POST", {
      type: "board",
      name: newBoardName,
      color: newBoardColor,
      memberIds: newBoardMemberIds,
    });
    setNewBoardName("");
    setNewBoardColor("#C9A96E");
    setNewBoardMemberIds([]);
    setShowNewBoard(false);
    fetchBoards();
  }

  async function updateBoard() {
    if (!editBoard || !editBoardName.trim()) return;
    await api("PUT", {
      id: editBoard.id,
      type: "board",
      name: editBoardName,
      color: editBoardColor,
      memberIds: editBoardMemberIds,
    });
    setEditBoard(null);
    fetchBoards();
  }

  async function deleteBoard(boardId: string) {
    if (!confirm("Tem a certeza que deseja eliminar esta coluna e todas as suas tarefas?")) return;
    await api("DELETE", { id: boardId, type: "board" });
    fetchBoards();
  }

  // ============================================================
  // Task CRUD
  // ============================================================

  async function createTask() {
    if (!newTaskBoardId || !newTaskTitle.trim()) return;
    await api("POST", { type: "task", boardId: newTaskBoardId, title: newTaskTitle });
    setNewTaskTitle("");
    setNewTaskBoardId(null);
    fetchBoards();
  }

  async function updateTaskField(taskId: string, fields: Record<string, unknown>) {
    await api("PUT", { id: taskId, type: "task", ...fields });
    fetchBoards();
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Tem a certeza que deseja eliminar esta tarefa?")) return;
    await api("DELETE", { id: taskId, type: "task" });
    setSelectedTask(null);
    fetchBoards();
  }

  // ============================================================
  // Checklist CRUD
  // ============================================================

  async function addChecklist(taskId: string) {
    if (!newChecklistName.trim()) return;
    const cl = await api("POST", { type: "checklist", taskId, name: newChecklistName });
    setNewChecklistName("");
    setShowAddChecklist(false);
    // Update selected task locally and open add-item for the new checklist
    if (selectedTask && cl.id) {
      setSelectedTask({ ...selectedTask, checklists: [...selectedTask.checklists, cl] });
      setAddItemChecklistId(cl.id);
      setNewItemText("");
    }
    fetchBoards();
  }

  async function deleteChecklist(checklistId: string) {
    await api("DELETE", { id: checklistId, type: "checklist" });
    if (selectedTask) {
      setSelectedTask({
        ...selectedTask,
        checklists: selectedTask.checklists.filter((c) => c.id !== checklistId),
      });
    }
    fetchBoards();
  }

  async function toggleChecklistItem(checklist: TaskChecklist, index: number) {
    const items = parseChecklistItems(checklist.items);
    items[index].checked = !items[index].checked;
    const newItems = JSON.stringify(items);
    await api("PUT", { id: checklist.id, type: "checklist", items: newItems });
    if (selectedTask) {
      setSelectedTask({
        ...selectedTask,
        checklists: selectedTask.checklists.map((c) =>
          c.id === checklist.id ? { ...c, items: newItems } : c
        ),
      });
    }
    fetchBoards();
  }

  async function addChecklistItem(checklistId: string) {
    if (!newItemText.trim()) return;
    const checklist = selectedTask?.checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const items = parseChecklistItems(checklist.items);
    items.push({ text: newItemText, checked: false });
    const newItems = JSON.stringify(items);
    await api("PUT", { id: checklistId, type: "checklist", items: newItems });
    setNewItemText("");
    setAddItemChecklistId(null);
    if (selectedTask) {
      setSelectedTask({
        ...selectedTask,
        checklists: selectedTask.checklists.map((c) =>
          c.id === checklistId ? { ...c, items: newItems } : c
        ),
      });
    }
    fetchBoards();
  }

  // ============================================================
  // Label CRUD
  // ============================================================

  async function addLabel() {
    if (!selectedTask || !newLabelName.trim()) return;
    const label = await api("POST", {
      type: "label",
      taskId: selectedTask.id,
      name: newLabelName,
      color: newLabelColor,
    });
    setNewLabelName("");
    setShowAddLabel(false);
    if (label.id) {
      setSelectedTask({ ...selectedTask, labels: [...selectedTask.labels, label] });
    }
    fetchBoards();
  }

  async function deleteLabel(labelId: string) {
    await api("DELETE", { id: labelId, type: "label" });
    if (selectedTask) {
      setSelectedTask({
        ...selectedTask,
        labels: selectedTask.labels.filter((l) => l.id !== labelId),
      });
    }
    fetchBoards();
  }

  // ============================================================
  // Comments
  // ============================================================

  async function addComment() {
    if (!selectedTask || !newComment.trim()) return;
    const author = session?.user?.name || "Admin";
    const comment = await api("POST", {
      type: "comment",
      taskId: selectedTask.id,
      author,
      content: newComment,
    });
    setNewComment("");
    if (comment.id) {
      setTaskComments([...taskComments, comment]);
      setSelectedTask({
        ...selectedTask,
        _count: { comments: selectedTask._count.comments + 1 },
      });
    }
    fetchBoards();
  }

  async function deleteComment(commentId: string) {
    await api("DELETE", { id: commentId, type: "comment" });
    setTaskComments(taskComments.filter((c) => c.id !== commentId));
    if (selectedTask) {
      setSelectedTask({
        ...selectedTask,
        _count: { comments: Math.max(0, selectedTask._count.comments - 1) },
      });
    }
    fetchBoards();
  }

  // ============================================================
  // Attachments
  // ============================================================

  async function uploadAttachment(file: File) {
    if (!selectedTask) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("taskId", selectedTask.id);
    const res = await fetch("/api/tasks/upload", { method: "POST", body: formData });
    if (res.ok) {
      const attachment = await res.json();
      setSelectedTask({
        ...selectedTask,
        attachments: [...selectedTask.attachments, attachment],
      });
      fetchBoards();
    }
  }

  async function deleteAttachment(attachmentId: string) {
    await api("DELETE", { id: attachmentId, type: "attachment" });
    if (selectedTask) {
      setSelectedTask({
        ...selectedTask,
        attachments: selectedTask.attachments.filter((a) => a.id !== attachmentId),
      });
    }
    fetchBoards();
  }

  // ============================================================
  // Drag & Drop
  // ============================================================

  function handleDragStart(e: React.DragEvent, task: Task, boardId: string) {
    dragTaskId.current = task.id;
    dragFromBoardId.current = boardId;
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, toBoardId: string) {
    e.preventDefault();
    const taskId = dragTaskId.current;
    const fromBoardId = dragFromBoardId.current;
    if (!taskId || fromBoardId === toBoardId) return;
    dragTaskId.current = null;
    dragFromBoardId.current = null;

    await api("PUT", { id: taskId, type: "task", boardId: toBoardId });
    fetchBoards();
  }

  // ============================================================
  // Open task detail
  // ============================================================

  function openTaskDetail(task: Task) {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setDescDirty(false);
    setEditingTitle(false);
    setShowAddLabel(false);
    setShowAddChecklist(false);
    setTaskComments([]);
    setNewComment("");
    fetchTaskCommentsDirectly(task.id);
  }

  async function fetchTaskCommentsDirectly(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/comments?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTaskComments(data);
      }
    } catch {
      // ignore
    }
  }

  // ============================================================
  // Render helpers
  // ============================================================

  function MemberAvatars({ members }: { members: BoardMember[] }) {
    if (members.length === 0) return null;
    return (
      <div className="flex -space-x-1">
        {members.slice(0, 3).map((m) => (
          <div
            key={m.id}
            className="h-6 w-6 rounded-full bg-white/30 text-white text-[10px] font-bold flex items-center justify-center border border-white/50"
            title={m.employee.name}
          >
            {m.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        ))}
        {members.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center border border-white/50">
            +{members.length - 3}
          </div>
        )}
      </div>
    );
  }

  function EmployeeCheckboxList({
    selectedIds,
    onChange,
  }: {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
  }) {
    return (
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {employees.map((emp) => (
          <label key={emp.id} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selectedIds.includes(emp.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selectedIds, emp.id]);
                } else {
                  onChange(selectedIds.filter((id) => id !== emp.id));
                }
              }}
              className="rounded border-gray-300"
            />
            {emp.name}
          </label>
        ))}
        {employees.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum colaborador encontrado.</p>
        )}
      </div>
    );
  }

  // ============================================================
  // Loading
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operacional</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quadro de tarefas da clinica
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setShowNewBoard(true); setNewBoardMemberIds([]); }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova Coluna
          </Button>
        )}
      </div>

      {/* Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {boards.map((board) => (
          <div
            key={board.id}
            className="flex-shrink-0 flex flex-col"
            style={{ minWidth: 300, maxWidth: 340, width: 320 }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, board.id)}
          >
            <Card className="flex flex-col h-full overflow-hidden">
              {/* Column Header */}
              <div
                className="px-4 py-3 flex items-center justify-between gap-2"
                style={{ backgroundColor: board.color }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-white truncate text-sm">
                    {board.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs shrink-0 bg-white/20 text-white border-0">
                    {board.tasks.length}
                  </Badge>
                  <MemberAvatars members={board.members} />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditBoard(board);
                      setEditBoardName(board.name);
                      setEditBoardColor(board.color);
                      setEditBoardMemberIds(board.members.map((m) => m.employeeId));
                    }}
                    className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                    title="Editar coluna"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteBoard(board.id)}
                    className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                    title="Eliminar coluna"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tasks */}
              <CardContent
                className="flex-1 p-2 space-y-2 overflow-y-auto"
                style={{ backgroundColor: `${board.color}10` }}
              >
                {board.tasks.map((task) => {
                  const status = getDueDateStatus(task.dueDate);
                  const clProgress = getChecklistProgress(task.checklists);
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task, board.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openTaskDetail(task)}
                      className={`bg-white dark:bg-card rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
                        task.completed ? "opacity-60" : ""
                      }`}
                    >
                      {/* Label badges */}
                      {task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {task.labels.map((label) => (
                            <span
                              key={label.id}
                              className="inline-block h-2 w-8 rounded-full"
                              style={{ backgroundColor: label.color }}
                              title={label.name}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`}
                              title={PRIORITY_LABELS[task.priority]}
                            />
                            <span className={`font-semibold text-sm leading-tight ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </span>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.dueDate && (
                              <Badge
                                variant={status === "overdue" ? "destructive" : "secondary"}
                                className={`text-xs font-["DM_Sans",sans-serif] ${
                                  status === "today"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : status === "normal"
                                    ? "bg-muted text-muted-foreground"
                                    : ""
                                }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(task.dueDate)}
                              </Badge>
                            )}

                            {task.description && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1" title="Tem descrição">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
                                </svg>
                              </span>
                            )}

                            {clProgress && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {clProgress.done}/{clProgress.total}
                              </span>
                            )}

                            {task.attachments.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {task.attachments.length}
                              </span>
                            )}

                            {task._count.comments > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                {task._count.comments}
                              </span>
                            )}

                            {task.assignee && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {task.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Task Button */}
                <button
                  onClick={() => {
                    setNewTaskBoardId(board.id);
                    setNewTaskTitle("");
                  }}
                  className="w-full flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-card/50 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar cartão
                </button>
              </CardContent>
            </Card>
          </div>
        ))}

        {boards.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Nenhuma coluna criada. Clique em &quot;Nova Coluna&quot; para comecar.</p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* New Board Dialog */}
      {/* ============================================================ */}
      <Dialog open={showNewBoard} onOpenChange={setShowNewBoard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Ex: A Fazer"
                onKeyDown={(e) => e.key === "Enter" && createBoard()}
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={newBoardColor}
                  onChange={(e) => setNewBoardColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={newBoardColor}
                  onChange={(e) => setNewBoardColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label>Membros</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Se nenhum membro for selecionado, a coluna fica visivel para todos.
              </p>
              <EmployeeCheckboxList selectedIds={newBoardMemberIds} onChange={setNewBoardMemberIds} />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewBoard(false)}>Cancelar</Button>
              <Button onClick={createBoard}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Edit Board Dialog */}
      {/* ============================================================ */}
      <Dialog open={!!editBoard} onOpenChange={(open) => !open && setEditBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={editBoardName}
                onChange={(e) => setEditBoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && updateBoard()}
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={editBoardColor}
                  onChange={(e) => setEditBoardColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={editBoardColor}
                  onChange={(e) => setEditBoardColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label>Membros</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Se nenhum membro for selecionado, a coluna fica visivel para todos.
              </p>
              <EmployeeCheckboxList selectedIds={editBoardMemberIds} onChange={setEditBoardMemberIds} />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditBoard(null)}>Cancelar</Button>
              <Button onClick={updateBoard}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* New Task Dialog */}
      {/* ============================================================ */}
      <Dialog open={!!newTaskBoardId} onOpenChange={(open) => !open && setNewTaskBoardId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cartao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulo</Label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Ligar ao fornecedor"
                onKeyDown={(e) => e.key === "Enter" && createTask()}
                autoFocus
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewTaskBoardId(null)}>Cancelar</Button>
              <Button onClick={createTask}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Task Detail Dialog (Trello-like) */}
      {/* ============================================================ */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          {selectedTask && (
            <ScrollArea className="max-h-[90vh]">
              <div className="p-6">
                {/* Title */}
                <DialogHeader className="mb-4">
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-lg font-bold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateTaskField(selectedTask.id, { title: editTitle });
                            setSelectedTask({ ...selectedTask, title: editTitle });
                            setEditingTitle(false);
                          }
                          if (e.key === "Escape") setEditingTitle(false);
                        }}
                        onBlur={() => {
                          if (editTitle !== selectedTask.title) {
                            updateTaskField(selectedTask.id, { title: editTitle });
                            setSelectedTask({ ...selectedTask, title: editTitle });
                          }
                          setEditingTitle(false);
                        }}
                      />
                    </div>
                  ) : (
                    <DialogTitle
                      className="text-lg font-bold cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                      onClick={() => { setEditingTitle(true); setEditTitle(selectedTask.title); }}
                    >
                      {selectedTask.title}
                    </DialogTitle>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    em <span className="font-medium">{boards.find((b) => b.id === selectedTask.boardId)?.name}</span>
                  </p>
                </DialogHeader>

                <div className="flex gap-6">
                  {/* Left column - Main content */}
                  <div className="flex-1 min-w-0 space-y-6">
                    {/* Labels */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Etiquetas</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.labels.map((label) => (
                          <span
                            key={label.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                            <button
                              onClick={() => deleteLabel(label.id)}
                              className="ml-1 hover:opacity-70"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                        {showAddLabel ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newLabelName}
                              onChange={(e) => setNewLabelName(e.target.value)}
                              placeholder="Nome da etiqueta"
                              className="h-7 text-xs w-32"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && addLabel()}
                            />
                            <div className="flex gap-1">
                              {LABEL_COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setNewLabelColor(c)}
                                  className={`h-5 w-5 rounded-full border-2 ${newLabelColor === c ? "border-foreground" : "border-transparent"}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addLabel}>
                              OK
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddLabel(false)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAddLabel(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            + Etiqueta
                          </button>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Descrição</h4>
                      <Textarea
                        value={editDesc}
                        onChange={(e) => { setEditDesc(e.target.value); setDescDirty(true); }}
                        placeholder="Adicionar uma descrição mais detalhada..."
                        rows={3}
                        className="resize-none"
                      />
                      {descDirty && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            updateTaskField(selectedTask.id, { description: editDesc || null });
                            setSelectedTask({ ...selectedTask, description: editDesc || null });
                            setDescDirty(false);
                          }}
                        >
                          Guardar
                        </Button>
                      )}
                    </div>

                    <Separator />

                    {/* Checklists */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Checklists</h4>
                      </div>

                      {selectedTask.checklists.map((checklist) => {
                        const items = parseChecklistItems(checklist.items);
                        const doneCount = items.filter((i) => i.checked).length;
                        const totalCount = items.length;
                        const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                        return (
                          <div key={checklist.id} className="mb-4 last:mb-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{checklist.name}</span>
                              <button
                                onClick={() => deleteChecklist(checklist.id)}
                                className="text-xs text-muted-foreground hover:text-destructive"
                              >
                                Eliminar
                              </button>
                            </div>

                            {/* Progress bar */}
                            {totalCount > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-muted-foreground font-['DM_Sans',sans-serif] w-8">{pct}%</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Items */}
                            <div className="space-y-1">
                              {items.map((item, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={() => toggleChecklistItem(checklist, idx)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                                    {item.text}
                                  </span>
                                </label>
                              ))}
                            </div>

                            {/* Add item */}
                            {addItemChecklistId === checklist.id ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  value={newItemText}
                                  onChange={(e) => setNewItemText(e.target.value)}
                                  placeholder="Adicionar item..."
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addChecklistItem(checklist.id);
                                    if (e.key === "Escape") setAddItemChecklistId(null);
                                  }}
                                />
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addChecklistItem(checklist.id)}>
                                  Adicionar
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddItemChecklistId(null)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddItemChecklistId(checklist.id); setNewItemText(""); }}
                                className="text-xs text-muted-foreground hover:text-foreground mt-1"
                              >
                                + Adicionar item
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Add checklist */}
                      {showAddChecklist ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={newChecklistName}
                            onChange={(e) => setNewChecklistName(e.target.value)}
                            placeholder="Nome da checklist"
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addChecklist(selectedTask.id);
                              if (e.key === "Escape") setShowAddChecklist(false);
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addChecklist(selectedTask.id)}>
                            Adicionar
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowAddChecklist(true); setNewChecklistName(""); }}
                          className="text-xs text-muted-foreground hover:text-foreground mt-2"
                        >
                          + Checklist
                        </button>
                      )}
                    </div>

                    <Separator />

                    {/* Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Anexos</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Anexar
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadAttachment(file);
                            e.target.value = "";
                          }}
                        />
                      </div>

                      {selectedTask.attachments.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTask.attachments.map((att) => (
                            <div key={att.id} className="relative group border rounded-lg p-2">
                              {att.type === "image" ? (
                                <img
                                  src={att.url}
                                  alt={att.filename}
                                  className="w-full h-20 object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-20 flex items-center justify-center bg-muted rounded">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              )}
                              <p className="text-xs truncate mt-1">{att.filename}</p>
                              <button
                                onClick={() => deleteAttachment(att.id)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 transition-opacity"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhum anexo.</p>
                      )}
                    </div>

                    <Separator />

                    {/* Comments */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Comentarios</h4>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Escrever um comentario..."
                          className="text-sm"
                          onKeyDown={(e) => e.key === "Enter" && addComment()}
                        />
                        <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                          Enviar
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {taskComments.map((comment) => (
                          <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{comment.author}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-['DM_Sans',sans-serif]">
                                  {formatDateTime(comment.createdAt)}
                                </span>
                                <button
                                  onClick={() => deleteComment(comment.id)}
                                  className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))}
                        {taskComments.length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhum comentario.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right column - Sidebar */}
                  <div className="w-48 shrink-0 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adicionar</h4>
                      <div className="space-y-1">
                        {/* Assignee */}
                        <div>
                          <Label className="text-xs">Responsável</Label>
                          <select
                            className="w-full h-7 text-xs mt-1 rounded border border-input bg-background px-2"
                            value={selectedTask.assignee || ""}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              setSelectedTask({ ...selectedTask, assignee: val });
                              updateTaskField(selectedTask.id, { assignee: val });
                            }}
                          >
                            <option value="">Sem responsável</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.name}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Labels button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setShowAddLabel(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Etiquetas
                        </Button>

                        {/* Checklist button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => { setShowAddChecklist(true); setNewChecklistName(""); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Checklist
                        </Button>

                        {/* Due date */}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs mb-1"
                            onClick={() => {
                              // Focus the date input below
                              const el = document.getElementById("task-due-date");
                              if (el) el.focus();
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Datas
                          </Button>
                          <Input
                            id="task-due-date"
                            type="date"
                            value={selectedTask.dueDate ? selectedTask.dueDate.split("T")[0] : ""}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              updateTaskField(selectedTask.id, { dueDate: val });
                              setSelectedTask({ ...selectedTask, dueDate: val });
                            }}
                            className="h-7 text-xs font-['DM_Sans',sans-serif]"
                          />
                        </div>

                        {/* Attachment */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          Anexo
                        </Button>

                        {/* Priority */}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs mb-1"
                          >
                            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${PRIORITY_COLORS[selectedTask.priority]}`} />
                            Prioridade
                          </Button>
                          <Select
                            value={selectedTask.priority}
                            onValueChange={(val) => {
                              updateTaskField(selectedTask.id, { priority: val });
                              setSelectedTask({ ...selectedTask, priority: val });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Media</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Acoes</h4>
                      <div className="space-y-1">
                        {/* Move */}
                        <div>
                          <Label className="text-xs">Mover para</Label>
                          <Select
                            value={selectedTask.boardId}
                            onValueChange={(val) => {
                              updateTaskField(selectedTask.id, { boardId: val });
                              setSelectedTask({ ...selectedTask, boardId: val });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {boards.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Archive */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => {
                            const newCompleted = !selectedTask.completed;
                            updateTaskField(selectedTask.id, { completed: newCompleted });
                            setSelectedTask({ ...selectedTask, completed: newCompleted });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          {selectedTask.completed ? "Desarquivar" : "Arquivar"}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteTask(selectedTask.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
