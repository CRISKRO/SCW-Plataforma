import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag } from 'lucide-react-native';
import { apiClient } from '../../api/apiClient';

export default function MerchScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMerch = async () => {
      try {
        const res = await apiClient.get('/merch/');
        setProducts(res.data);
      } catch (error) {
        console.error('Error fetching merch:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMerch();
  }, []);

  const renderProduct = ({ item }: { item: any }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0].image : null;
    return (
      <View className="flex-1 m-2 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-full aspect-square bg-zinc-800" resizeMode="cover" />
        ) : (
          <View className="w-full aspect-square bg-zinc-800 items-center justify-center">
            <ShoppingBag color="#52525B" size={32} />
          </View>
        )}
        <View className="p-3">
          <Text className="text-white font-bold text-sm" numberOfLines={2}>{item.name}</Text>
          <Text className="text-red-500 font-black mt-1">${item.price}</Text>
          <TouchableOpacity className="mt-3 bg-white/10 rounded-lg py-2 items-center">
            <Text className="text-white text-xs font-bold uppercase tracking-wider">Ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-2 pt-2">
      <View className="mb-4 mt-2 px-2">
        <Text className="text-white font-black text-3xl uppercase tracking-tighter">TIENDA</Text>
        <Text className="text-red-600 font-black text-3xl uppercase tracking-tighter -mt-2">OFICIAL</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-zinc-500 text-center mt-10">Tienda vacía.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
