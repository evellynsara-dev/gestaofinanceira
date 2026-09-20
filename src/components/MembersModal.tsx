import React, { useState } from 'react';
import { X, UserPlus, Users, Trash2, Phone, Mail, Shield } from 'lucide-react';
import { Member, ProfileMode } from '../types';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  profileMode: ProfileMode;
  onSaveMembers: (members: Member[]) => void;
}

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👦', '👧', '👴', '👵', '👔', '💼', '💻', '🧑‍🔧', '🚀', '⭐'];
const COLOR_OPTIONS = ['#2563eb', '#db2777', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#475569'];

export const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  onClose,
  members,
  profileMode,
  onSaveMembers,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Member['role']>(profileMode === 'familia' ? 'Familiar' : 'Membro');
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      role,
      avatar,
      color,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    };

    onSaveMembers([...members, newMember]);
    setName('');
    setEmail('');
    setPhone('');
    setShowAddForm(false);
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) {
      alert('É necessário manter pelo menos um membro responsável.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este membro?')) {
      onSaveMembers(members.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {profileMode === 'familia' ? 'Membros da Família' : 'Equipe / Sócios da Empresa'}
              </h3>
              <p className="text-xs text-slate-500">
                Compartilhamento de despesas e responsabilidades
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Members List */}
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-xs"
                    style={{ backgroundColor: `${m.color}20`, border: `1.5px solid ${m.color}` }}
                  >
                    {m.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{m.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-0.5">
                        <Shield className="w-3 h-3 text-slate-400" />
                        {m.role}
                      </span>
                      {m.phone && <span>• {m.phone}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMember(m.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Remover Membro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Member Form or Button */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 px-3 border border-dashed border-slate-300 rounded-xl text-slate-600 font-semibold hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Novo Membro</span>
            </button>
          ) : (
            <form onSubmit={handleAddMember} className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs">Novo Membro</h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Silva, Gabriel Santos..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Função / Papel
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Member['role'])}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Familiar">Familiar</option>
                    <option value="Sócio">Sócio</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Membro">Membro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="+55 11 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Avatar Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ícone / Avatar
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                        avatar === av ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cor de Identificação
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'scale-110 ring-2 ring-slate-800' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                >
                  Adicionar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
