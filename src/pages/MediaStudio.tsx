import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Wand2, Image as ImageIcon, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MediaStudio() {
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [videoPrompt, setVideoPrompt] = useState<string>("");
  const [improvePrompt, setImprovePrompt] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedMedia, setGeneratedMedia] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media-generations')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-generations')
        .getPublicUrl(fileName);

      await supabase.from('media_generations').insert({
        user_id: user.id,
        type: 'image',
        output_url: publicUrl,
        status: 'completed'
      });

      setGeneratedMedia(publicUrl);
      toast({ title: "Succès", description: "Fichier uploadé avec succès" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer un prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt: imagePrompt }
      });

      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from('media_generations').insert({
        user_id: user.id,
        type: 'image',
        prompt: imagePrompt,
        output_url: data.imageUrl,
        status: 'completed'
      });

      setGeneratedMedia(data.imageUrl);
      toast({ title: "Succès", description: "Image générée avec succès" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveImage = async () => {
    if (!selectedFile || !improvePrompt.trim()) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image et entrer un prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media-generations')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-generations')
        .getPublicUrl(fileName);

      const { data, error } = await supabase.functions.invoke('improve-image', {
        body: { imageUrl: publicUrl, prompt: improvePrompt }
      });

      if (error) throw error;

      await supabase.from('media_generations').insert({
        user_id: user.id,
        type: 'improved_image',
        prompt: improvePrompt,
        input_url: publicUrl,
        output_url: data.imageUrl,
        status: 'completed'
      });

      setGeneratedMedia(data.imageUrl);
      toast({ title: "Succès", description: "Image améliorée avec succès" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer un prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { prompt: videoPrompt }
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const predictionId = data.id;
      
      await supabase.from('media_generations').insert({
        user_id: user.id,
        type: 'video',
        prompt: videoPrompt,
        output_url: '',
        status: 'processing',
        metadata: { predictionId }
      });

      toast({ 
        title: "Génération en cours", 
        description: "Votre vidéo est en cours de génération. Cela peut prendre quelques minutes." 
      });

      const checkStatus = async () => {
        const { data: statusData } = await supabase.functions.invoke('generate-video', {
          body: { predictionId }
        });

        if (statusData.status === 'succeeded') {
          const videoUrl = statusData.output?.[0];
          setGeneratedMedia(videoUrl);
          
          const { data: existingRecords } = await supabase
            .from('media_generations')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'video')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (existingRecords && existingRecords.length > 0) {
            await supabase.from('media_generations')
              .update({ output_url: videoUrl, status: 'completed' })
              .eq('id', existingRecords[0].id);
          }

          toast({ title: "Succès", description: "Vidéo générée avec succès" });
          setIsGenerating(false);
        } else if (statusData.status === 'failed') {
          throw new Error("La génération de vidéo a échoué");
        } else {
          setTimeout(checkStatus, 5000);
        }
      };

      setTimeout(checkStatus, 5000);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Studio Média</h1>
          <p className="text-muted-foreground">
            Créez, améliorez et générez des images et vidéos avec l'IA
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="generate">
              <ImageIcon className="w-4 h-4 mr-2" />
              Générer Image
            </TabsTrigger>
            <TabsTrigger value="improve">
              <Wand2 className="w-4 h-4 mr-2" />
              Améliorer Image
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="w-4 h-4 mr-2" />
              Générer Vidéo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload d'image</CardTitle>
                <CardDescription>Uploadez vos propres images</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Sélectionner un fichier</Label>
                  <Input id="file" type="file" accept="image/*" onChange={handleFileSelect} />
                </div>
                <Button onClick={handleUpload} disabled={isGenerating || !selectedFile}>
                  {isGenerating ? "Upload en cours..." : "Upload"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Génération d'image par IA</CardTitle>
                <CardDescription>Créez des images uniques avec Lovable AI (gratuit)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imagePrompt">Description de l'image</Label>
                  <Textarea
                    id="imagePrompt"
                    placeholder="Ex: Un coucher de soleil sur une plage tropicale..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                  />
                </div>
                <Button onClick={handleGenerateImage} disabled={isGenerating}>
                  {isGenerating ? "Génération..." : "Générer l'image"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="improve">
            <Card>
              <CardHeader>
                <CardTitle>Amélioration d'image par IA</CardTitle>
                <CardDescription>Améliorez vos images avec Lovable AI (gratuit)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="improveFile">Sélectionner une image</Label>
                  <Input id="improveFile" type="file" accept="image/*" onChange={handleFileSelect} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="improvePrompt">Instructions d'amélioration</Label>
                  <Textarea
                    id="improvePrompt"
                    placeholder="Ex: Rendre l'image plus lumineuse et ajouter des couleurs vives..."
                    value={improvePrompt}
                    onChange={(e) => setImprovePrompt(e.target.value)}
                  />
                </div>
                <Button onClick={handleImproveImage} disabled={isGenerating}>
                  {isGenerating ? "Amélioration..." : "Améliorer l'image"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle>Génération de vidéo par IA</CardTitle>
                <CardDescription>Créez des vidéos avec Replicate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoPrompt">Description de la vidéo</Label>
                  <Textarea
                    id="videoPrompt"
                    placeholder="Ex: Une animation d'un robot dansant..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                  />
                </div>
                <Button onClick={handleGenerateVideo} disabled={isGenerating}>
                  {isGenerating ? "Génération..." : "Générer la vidéo"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {generatedMedia && (
          <Card>
            <CardHeader>
              <CardTitle>Résultat</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedMedia.includes('video') || generatedMedia.includes('.mp4') ? (
                <video src={generatedMedia} controls className="w-full max-w-2xl mx-auto" />
              ) : (
                <img src={generatedMedia} alt="Generated" className="w-full max-w-2xl mx-auto" />
              )}
            </CardContent>
          </Card>
        )}
      </div>
  );
}
