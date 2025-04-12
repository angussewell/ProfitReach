import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface EditFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
}

export function UserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({ name: '', email: '', role: '' });

  useEffect(() => {
    if (session?.user?.organizationId) {
      fetchUsers();
    }
  }, [session?.user?.organizationId]);

  const fetchUsers = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Corrected URL: Removed duplicate organizationId
      const response = await fetch(`/api/organizations/${session?.user?.organizationId}/users`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch users');
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      setUsers(data);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching users:', error);
      setError(error.message);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.organizationId) return;

    setIsCreating(true);
    try {
      // Corrected URL: Removed duplicate organizationId
      const response = await fetch(`/api/organizations/${session.user.organizationId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const user = await response.json();
      setUsers(prev => [user, ...prev]);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      toast.success('User created successfully');
    } catch (err) {
      // Improved error handling to parse JSON response
      let errorMessage = 'Error creating user';
      if (err instanceof Error) {
        // If the error object itself has a message (e.g., network error), use it
        errorMessage = err.message; 
      }
      
      // Check if the error originated from a failed fetch response
      if (err instanceof Error && (err as any).response instanceof Response) {
        const response = (err as any).response as Response;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Failed with status: ${response.status}`;
        } catch (parseError) {
          // If JSON parsing fails, try getting text
          try {
            const errorText = await response.text();
            errorMessage = errorText || `Failed with status: ${response.status}`;
          } catch {
             errorMessage = `Failed with status: ${response.status}`;
          }
        }
      } else if (err instanceof Error) {
         // Use the error message if it's a generic Error
         errorMessage = err.message;
      }

      console.error('Error creating user:', err, 'Processed message:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!session?.user?.organizationId || !confirm('Are you sure you want to delete this user?')) return;

    setIsDeleting(true);
    try {
      // Corrected URL: Removed duplicate organizationId
      const response = await fetch(
        `/api/organizations/${session.user.organizationId}/users/${userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        let errorMsg = 'Failed to delete user';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } catch (err) {
      const error = err as Error;
      console.error('Error deleting user:', error);
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    if (user.role === 'admin') {
      toast.error("Cannot edit admin users.");
      return;
    }
    setCurrentUserToEdit(user);
    setEditFormData({ name: user.name, email: user.email, role: user.role, password: '' });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditRoleChange = (value: string) => {
    setEditFormData(prev => ({ ...prev, role: value }));
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserToEdit || !session?.user?.organizationId) return;

    setIsEditing(true);
    const payload: Partial<EditFormData> = {};
    
    if (editFormData.name !== currentUserToEdit.name) payload.name = editFormData.name;
    if (editFormData.email !== currentUserToEdit.email) payload.email = editFormData.email;
    if (editFormData.role !== currentUserToEdit.role) payload.role = editFormData.role;
    if (editFormData.password && editFormData.password.trim() !== '') payload.password = editFormData.password;
    
    if (Object.keys(payload).length === 0) {
        toast.info("No changes detected.");
        setIsEditModalOpen(false);
        setIsEditing(false);
        return;
    }

    try {
      // Corrected URL: Removed duplicate organizationId
      const response = await fetch(
        `/api/organizations/${session.user.organizationId}/users/${currentUserToEdit.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        let errorMsg = `Failed to update user (Status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.details?._errors?.join(', ') || errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
      setIsEditModalOpen(false);
      toast.success('User updated successfully');
    } catch (err) {
      const error = err as Error;
      console.error('Error updating user:', error);
      toast.error(error.message);
    } finally {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center p-8 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {session?.user?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-[#2e475d] mb-4">Create New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newName">Name</Label>
                <Input id="newName" type="text" required value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}/>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newEmail">Email</Label>
                <Input id="newEmail" type="email" required value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}/>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">Password</Label>
                <Input id="newPassword" type="password" required value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}/>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newRole">Role</Label>
                <Select value={newUser.role} onValueChange={value => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger id="newRole"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>) : (<><Plus className="w-4 h-4 mr-2" /> Create User</>)}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#2e475d]">Organization Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {session?.user?.role === 'admin' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(users) && users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    {session?.user?.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {user.id !== session.user.id && user.role !== 'admin' && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            title="Edit User"
                            onClick={() => handleOpenEditModal(user)} 
                            disabled={isEditing || isDeleting}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {user.id !== session.user.id && (
                           <Button 
                            variant="outline" 
                            size="icon"
                            title="Delete User"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isDeleting || isEditing}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User: {currentUserToEdit?.name}</DialogTitle>
            <DialogDescription>Make changes to the user profile. Click save when done.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editName" className="text-right">Name</Label>
                <Input id="editName" name="name" value={editFormData.name} onChange={handleEditFormChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editEmail" className="text-right">Email</Label>
                <Input id="editEmail" name="email" type="email" value={editFormData.email} onChange={handleEditFormChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPassword" className="text-right">New Password</Label>
                <Input id="editPassword" name="password" type="password" placeholder="Leave blank to keep current" value={editFormData.password || ''} onChange={handleEditFormChange} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editRole" className="text-right">Role</Label>
                <Select name="role" value={editFormData.role} onValueChange={handleEditRoleChange}>
                  <SelectTrigger id="editRole" className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
