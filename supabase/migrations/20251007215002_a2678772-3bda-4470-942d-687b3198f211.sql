-- Table pour stocker les conversations
CREATE TABLE IF NOT EXISTS public.alfie_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les messages
CREATE TABLE IF NOT EXISTS public.alfie_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.alfie_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alfie_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alfie_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour alfie_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.alfie_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.alfie_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.alfie_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.alfie_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour alfie_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.alfie_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alfie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.alfie_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alfie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their conversations"
  ON public.alfie_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.alfie_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Index pour améliorer les performances
CREATE INDEX idx_alfie_conversations_user_id ON public.alfie_conversations(user_id);
CREATE INDEX idx_alfie_messages_conversation_id ON public.alfie_messages(conversation_id);
CREATE INDEX idx_alfie_messages_created_at ON public.alfie_messages(created_at);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_alfie_conversations_updated_at
  BEFORE UPDATE ON public.alfie_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();