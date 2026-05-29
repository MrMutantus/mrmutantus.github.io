import { useCallback, useState } from 'react';
import type { StoredWeapon, Weapon } from '../types';

const SERIAL_RE = /^\d{0,16}$/;

export function useWeaponEdit(onSaveWeapon: (updated: StoredWeapon) => void) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoredWeapon | null>(null);
  const [serialError, setSerialError] = useState('');

  const startEdit = useCallback((e: React.MouseEvent, w: Weapon) => {
    e.stopPropagation();
    setEditingId(w.id);
    setDraft({ id: w.id, weaponType: w.weaponType, serialNumber: w.serialNumber, notes: w.notes, suspect: w.suspect ?? '' });
    setSerialError('');
  }, []);

  const handleSerialChange = useCallback((val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setDraft(d => d ? { ...d, serialNumber: val } : d);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  }, []);

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draft) return;
    if (draft.serialNumber.length > 0 && draft.serialNumber.length !== 16) {
      setSerialError('Serial number must be exactly 16 digits');
      return;
    }
    onSaveWeapon(draft);
    setEditingId(null);
    setDraft(null);
  }, [draft, onSaveWeapon]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setDraft(null);
    setSerialError('');
  }, []);

  return { editingId, draft, setDraft, serialError, startEdit, handleSerialChange, handleSave, handleCancel };
}
