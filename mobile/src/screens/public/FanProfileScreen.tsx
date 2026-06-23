import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, Ticket } from 'lucide-react-native';

export default function FanProfileScreen({ navigation }: any) {
  const { isAuthenticated, user, logout } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-8">
        <View className="w-20 h-20 bg-zinc-900 rounded-full items-center justify-center mb-6">
          <User color="#52525B" size={40} />
        </View>
        <Text className="text-white text-2xl font-black uppercase tracking-wider text-center mb-2">
          Únete a SCW
        </Text>
        <Text className="text-zinc-400 text-center mb-8">
          Inicia sesión para ver tus boletos y realizar compras más rápido.
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Login')}
          className="w-full bg-red-600 rounded-xl py-4 items-center shadow-lg shadow-red-600/30"
        >
          <Text className="text-white font-bold uppercase tracking-widest">Iniciar Sesión</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black px-6">
      <View className="flex-row justify-between items-center py-6 border-b border-white/10 mb-6">
        <View>
          <Text className="text-white font-black tracking-widest text-2xl">MI PERFIL</Text>
          <Text className="text-red-500 text-sm font-bold mt-1">{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout} className="p-3 bg-zinc-900 rounded-full">
          <LogOut color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity className="bg-zinc-900 p-6 rounded-2xl flex-row items-center border border-white/5">
        <View className="bg-red-600/20 p-3 rounded-full mr-4">
          <Ticket color="#ef4444" size={24} />
        </View>
        <View>
          <Text className="text-white font-bold text-lg">Mis Boletos</Text>
          <Text className="text-zinc-400 text-xs mt-1">Ver códigos QR para acceso</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
