export type UserRole = 'admin' | 'entreprise' | 'etudiant' | 'particulier';

export type QuestionnaireTarget = 'entreprise' | 'etudiant';

/** Demande en attente, validée (visible par les deux parties), ou refusée. */
export type MatchStatus = 'pending' | 'validated' | 'rejected';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkboxes'
  | 'file'
  | 'info'
  | 'date'
  | 'time'
  | 'datetime';
