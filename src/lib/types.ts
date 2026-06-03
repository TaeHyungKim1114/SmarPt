export type UserRole = "trainer" | "member";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  invite_code: string | null;
  created_at: string;
};

export type WorkoutSet = {
  weight: number | null;
  reps: number | null;
  completed?: boolean;
};

export type WorkoutExercise = {
  id: string;
  workout_id: string;
  name: string;
  sets: WorkoutSet[];
  sort_order: number;
  memo: string | null;
};

export type Workout = {
  id: string;
  member_id: string;
  workout_date: string;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  workout_exercises?: WorkoutExercise[];
};

export type MealEntry = {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  foods: string;
  calories?: number | null;
};

export type DietLog = {
  id: string;
  member_id: string;
  log_date: string;
  meals: MealEntry[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  trainer_id: string;
  member_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type TrainerMember = {
  id: string;
  trainer_id: string;
  member_id: string;
  created_at: string;
  member?: Profile;
};
