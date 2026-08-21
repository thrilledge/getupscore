"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Shield, ShieldOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  plan: string;
  createdAt: string;
  lastSignIn: string | null;
}

interface UsersResponse {
  ok: boolean;
  users: AdminUser[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function fetchUsers(p: number, q: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), per_page: "20" });
    if (q) params.set("search", q);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d: UsersResponse) => {
        if (d.ok) {
          setUsers(d.users);
          setTotal(d.total);
          setTotalPages(d.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

  function handleSearch() {
    setPage(1);
    fetchUsers(1, search);
  }

  async function toggleAdmin(userId: string, current: boolean) {
    setUpdatingId(userId);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: !current }),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isAdmin: !current } : u
        )
      );
    } catch {}
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Users ({total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-8 w-64 text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                <Search className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Last Sign In</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs font-medium max-w-[200px] truncate">
                        {u.email}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {u.displayName || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.plan === "pro" ? "default" : "secondary"}
                          className={u.plan === "pro" ? "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20" : ""}
                        >
                          {u.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.isAdmin ? "default" : "secondary"}
                          className={u.isAdmin ? "bg-blue-500/15 text-blue-600 border-blue-500/20" : ""}
                        >
                          {u.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => toggleAdmin(u.id, u.isAdmin)}
                          disabled={updatingId === u.id}
                        >
                          {u.isAdmin ? (
                            <ShieldOff className="size-3.5 text-red-500" />
                          ) : (
                            <Shield className="size-3.5 text-blue-500" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
