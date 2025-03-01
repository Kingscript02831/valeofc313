import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { EventForm } from "@/components/admin/EventForm";
import { EventList } from "@/components/admin/EventList";

type Event = Database['public']['Tables']['events']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

const AdminEvents = () => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchEventTerm, setSearchEventTerm] = useState("");

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("page_type", "events");

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
      return;
    }

    if (data) {
      setCategories(data);
    }
  };

  const fetchEvents = async () => {
    let query = supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (searchEventTerm) {
      query = query.ilike("title", `%${searchEventTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching events:", error);
      toast.error("Erro ao carregar eventos");
      return;
    }

    if (data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchEvents();
  }, [searchEventTerm]);

  const handleEventSubmit = async (eventData: Omit<Event, 'id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para realizar esta ação.");
        return;
      }

      // Remove any undefined, null, or empty string values from eventData
      const cleanEventData = Object.fromEntries(
        Object.entries(eventData).filter(([_, v]) => v != null && v !== "")
      );

      // Ensure user_id is set and required fields are present
      const finalEventData = {
        ...cleanEventData,
        user_id: user.id,
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.event_date,
        event_time: eventData.event_time,
        end_time: eventData.end_time
      };

      console.log("Submitting event data:", finalEventData);

      const { data, error } = await supabase
        .from("events")
        .insert([finalEventData])
        .select()
        .single();

      if (error) {
        console.error("Error details:", error);
        toast.error(`Erro ao adicionar evento: ${error.message}`);
        return;
      }

      toast.success("Evento adicionado com sucesso!");
      fetchEvents();
    } catch (error: any) {
      console.error("Error adding event:", error);
      toast.error(`Erro ao adicionar evento: ${error.message}`);
    }
  };

  const handleEventEdit = async (eventData: Omit<Event, 'id' | 'created_at'>) => {
    try {
      if (!editingEvent?.id) {
        toast.error("ID do evento não encontrado");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para realizar esta ação.");
        return;
      }

      // Remove any undefined, null, or empty string values from eventData
      const cleanEventData = Object.fromEntries(
        Object.entries(eventData).filter(([_, v]) => v != null && v !== "")
      );

      // Ensure user_id is maintained
      const finalEventData = {
        ...cleanEventData,
        user_id: user.id
      };

      console.log("Updating event data:", finalEventData);

      const { error } = await supabase
        .from("events")
        .update(finalEventData)
        .eq("id", editingEvent.id);

      if (error) {
        console.error("Error details:", error);
        toast.error(`Erro ao atualizar evento: ${error.message}`);
        return;
      }

      toast.success("Evento atualizado com sucesso!");
      setEditingEvent(null);
      fetchEvents();
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    }
  };

  const handleEventDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error details:", error);
        toast.error(`Erro ao remover evento: ${error.message}`);
        return;
      }

      toast.success("Evento removido com sucesso!");
      fetchEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error(`Erro ao remover evento: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {!editingEvent ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Adicionar Evento</h2>
          <EventForm 
            categories={categories}
            onSubmit={handleEventSubmit}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Editar Evento</h2>
          <EventForm
            initialData={editingEvent}
            categories={categories}
            onSubmit={handleEventEdit}
            onCancel={() => setEditingEvent(null)}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <EventList 
          events={events}
          categories={categories}
          searchTerm={searchEventTerm}
          onSearchChange={setSearchEventTerm}
          onEdit={setEditingEvent}
          onDelete={handleEventDelete}
        />
      </div>
    </div>
  );
};

export default AdminEvents;
