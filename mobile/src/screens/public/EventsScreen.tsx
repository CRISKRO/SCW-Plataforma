import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, User, Ticket, Calendar, MapPin, ChevronRight } from 'lucide-react-native';
import { apiClient } from '../../api/apiClient';

export default function EventsScreen({ navigation }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/events/');
      // Sorting events to get the upcoming one first if necessary
      setEvents(res.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // El evento principal será el primero de la lista
  const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      {/* HEADER */}
      <View className="flex-row justify-between items-center px-4 pt-2 pb-4 border-b border-white/5 bg-[#09090b] z-10">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-black rounded-full border border-white/20 items-center justify-center mr-3">
            <Text className="text-white font-black text-xs italic">SCW</Text>
          </View>
          <View>
            <Text className="text-white font-black text-xs uppercase tracking-widest leading-tight">STRONG CLASSIC</Text>
            <Text className="text-white font-black text-xs uppercase tracking-widest leading-tight">WRESTLING</Text>
          </View>
        </View>
        
        <View className="flex-row gap-3">
          <TouchableOpacity className="w-10 h-10 rounded-full border border-white/20 items-center justify-center bg-transparent">
            <ShoppingCart color="#fff" size={18} />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full border border-white/20 items-center justify-center bg-transparent">
            <User color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
      >
        {loading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color="#ef4444" />
          </View>
        ) : nextEvent ? (
          <View className="px-4 pt-6 pb-12">
            
            {/* IMAGEN DEL EVENTO */}
            <View className="w-full aspect-[4/5] bg-zinc-900 mb-6 rounded-sm border-l-4 border-l-red-600 overflow-hidden relative">
              {nextEvent.images && nextEvent.images.length > 0 ? (
                <Image 
                  source={{ uri: nextEvent.images[0].image }} 
                  className="w-full h-full" 
                  resizeMode="cover" 
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-zinc-800">
                  <Text className="text-zinc-600 font-bold uppercase tracking-widest">Sin Imagen</Text>
                </View>
              )}
              {/* Sutil gradiente inferior para fundir con el fondo negro */}
              <View className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#09090b] to-transparent" />
            </View>

            {/* ETIQUETAS DE FECHA Y LUGAR */}
            <View className="flex-row flex-wrap gap-2 mb-3">
              <View className="bg-red-600 flex-row items-center px-3 py-1.5 rounded-full">
                <Ticket color="#fff" size={14} />
                <Text className="text-white font-bold text-xs uppercase tracking-widest ml-1.5">PRÓXIMO EVENTO</Text>
              </View>
              
              <View className="bg-transparent border border-white/20 flex-row items-center px-3 py-1.5 rounded-full">
                <Calendar color="#a1a1aa" size={14} />
                <Text className="text-zinc-300 font-medium text-xs ml-1.5">
                  {new Date(nextEvent.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>

            <View className="bg-transparent border border-white/20 flex-row items-center px-3 py-2 rounded-full mb-5">
              <MapPin color="#ef4444" size={14} />
              <Text className="text-zinc-300 font-medium text-xs ml-2" numberOfLines={1}>
                {nextEvent.location}
              </Text>
            </View>

            {/* DESCRIPCIÓN */}
            <Text className="text-zinc-400 text-center text-sm mb-8 px-2 leading-relaxed">
              {nextEvent.description || "No es una alerta meteorológica. Es una advertencia. En temporada de lluvias, una leyenda se avecina..."}
            </Text>

            {/* BOTONES */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('EventDetail', { eventId: nextEvent.id, event: nextEvent })}
              className="w-full bg-white flex-row items-center justify-center py-4 rounded-lg mb-3 active:bg-zinc-200"
            >
              <Ticket color="#000" size={18} />
              <Text className="text-black font-black text-sm uppercase tracking-widest ml-2 mr-1">
                COMPRAR BOLETOS
              </Text>
              <ChevronRight color="#000" size={18} />
            </TouchableOpacity>

            <TouchableOpacity className="w-full bg-transparent border border-white/20 flex-row items-center justify-center py-4 rounded-lg active:bg-zinc-900">
              <Text className="text-white font-bold text-xs uppercase tracking-widest">
                TODOS LOS EVENTOS
              </Text>
            </TouchableOpacity>

          </View>
        ) : (
          <View className="mt-20 items-center">
            <Text className="text-zinc-500 font-medium text-center px-8">Aún no hay eventos anunciados. Mantente pendiente.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
