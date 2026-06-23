import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, MapPin, Ticket, AlertCircle } from 'lucide-react-native';
import { apiClient } from '../../api/apiClient';

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId, event: initialEvent } = route.params;
  const [event, setEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(!initialEvent);

  useEffect(() => {
    if (!event) {
      const fetchEvent = async () => {
        try {
          const res = await apiClient.get(`/events/${eventId}/`);
          setEvent(res.data);
        } catch (error) {
          console.error('Error fetching event details', error);
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [eventId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b] justify-center items-center">
        <ActivityIndicator size="large" color="#ef4444" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b] justify-center items-center">
        <Text className="text-white">Evento no encontrado</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 p-2 bg-red-600 rounded">
          <Text className="text-white font-bold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrl = event.images && event.images.length > 0 ? event.images[0].image : null;
  const isPast = new Date(event.date) < new Date();

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]" edges={['top']}>
      {/* HEADER NAVEGACION */}
      <View className="absolute top-12 left-4 z-20">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-black/50 rounded-full items-center justify-center border border-white/20 backdrop-blur-md"
        >
          <ArrowLeft color="white" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" bounces={false}>
        {/* IMAGEN HERO */}
        <View className="w-full aspect-[4/5] bg-zinc-900 relative">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center bg-zinc-800">
              <Text className="text-zinc-600 font-bold uppercase tracking-widest">Sin Imagen</Text>
            </View>
          )}
          <View className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-[#09090b] to-transparent" />
        </View>

        {/* DETALLES */}
        <View className="px-4 -mt-10 pb-20">
          <Text className="text-white font-black text-3xl uppercase tracking-tighter mb-4">{event.title}</Text>
          
          <View className="bg-zinc-900 p-4 rounded-xl border border-white/10 mb-6">
            <View className="flex-row items-center mb-3">
              <Calendar color="#ef4444" size={20} />
              <View className="ml-3">
                <Text className="text-white font-bold uppercase tracking-wider text-sm">
                  {new Date(event.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text className="text-zinc-400 text-xs">Apertura de puertas: {event.time}</Text>
              </View>
            </View>
            
            <View className="w-full h-[1px] bg-white/5 my-2" />
            
            <View className="flex-row items-center mt-3">
              <MapPin color="#ef4444" size={20} />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold uppercase tracking-wider text-sm">Ubicación</Text>
                <Text className="text-zinc-400 text-xs leading-relaxed mt-0.5">{event.location}</Text>
              </View>
            </View>
          </View>

          <Text className="text-white font-black text-lg uppercase tracking-widest mb-3 border-b border-red-600/50 pb-2 inline-block">
            Acerca del Evento
          </Text>
          <Text className="text-zinc-400 text-sm leading-relaxed mb-8">
            {event.description || "Prepárate para la mejor acción de la lucha libre local. Un evento que no te puedes perder con todas las estrellas de SCW en el cuadrilátero."}
          </Text>

          {/* TIPOS DE BOLETOS */}
          <Text className="text-white font-black text-lg uppercase tracking-widest mb-4">Boletos Disponibles</Text>
          
          {isPast ? (
            <View className="bg-zinc-900 p-5 rounded-xl border border-red-900 flex-row items-center">
              <AlertCircle color="#ef4444" size={24} />
              <Text className="text-white ml-3 font-bold uppercase tracking-wider flex-1">Este evento ya concluyó</Text>
            </View>
          ) : event.ticket_types && event.ticket_types.length > 0 ? (
            event.ticket_types.map((ticket: any) => (
              <TouchableOpacity 
                key={ticket.id} 
                className="bg-zinc-900 p-4 rounded-xl border border-white/10 mb-3 flex-row justify-between items-center active:bg-zinc-800"
              >
                <View>
                  <Text className="text-white font-bold uppercase tracking-wider">{ticket.name}</Text>
                  <Text className="text-zinc-500 text-xs mt-1">{ticket.description || "Acceso general"}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-red-500 font-black text-lg">${ticket.price}</Text>
                  <View className="bg-red-600/20 px-2 py-0.5 rounded mt-1">
                    <Text className="text-red-500 text-[10px] font-bold uppercase">Añadir</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
             <View className="bg-zinc-900 p-5 rounded-xl border border-white/5 items-center">
                <Ticket color="#52525B" size={24} className="mb-2" />
                <Text className="text-zinc-400 text-center text-sm">Boletos no disponibles por el momento.</Text>
             </View>
          )}

        </View>
      </ScrollView>

      {/* FIXED BOTTOM BAR FOR BUYING */}
      {!isPast && (
        <View className="absolute bottom-0 w-full bg-[#09090b] border-t border-white/10 p-4 pb-8">
          <TouchableOpacity className="w-full bg-red-600 flex-row items-center justify-center py-4 rounded-xl shadow-lg shadow-red-600/20">
            <Ticket color="white" size={20} />
            <Text className="text-white font-black text-sm uppercase tracking-widest ml-2">Ir al Carrito</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
