from rest_framework import serializers
from .models import Fighter, Event, Match, Chronicle, Sponsor, EventPost


class FighterSerializer(serializers.ModelSerializer):

    # Returns the full absolute URL of the image (e.g. http://localhost:8000/media/fighters/foto.jpg)
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Fighter
        fields = ['id', 'name', 'nickname', 'bio', 'weight_kg', 'height_cm',
                  'instagram', 'tiktok', 'twitter', 'facebook', 'signature_move', 'achievements', 'image', 'is_active', 'is_student', 'image_url']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False, 'allow_null': True},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return ''


class MatchSerializer(serializers.ModelSerializer):
    fighters = FighterSerializer(many=True, read_only=True)
    fighter_ids = serializers.PrimaryKeyRelatedField(
        queryset=Fighter.objects.all(), source='fighters', write_only=True, many=True
    )

    class Meta:
        model = Match
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    matches = MatchSerializer(many=True, read_only=True)
    banner_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'date_time', 'location', 'banner',
                  'status', 'ticket_link', 'is_multi_day', 'created_at', 'updated_at', 'matches', 'banner_url']
        extra_kwargs = {
            'banner': {'write_only': True, 'required': False, 'allow_null': True},
            'description': {'required': False},
            'ticket_link': {'required': False},
            'status': {'required': False},
            'is_multi_day': {'required': False},
        }

    def get_banner_url(self, obj):
        request = self.context.get('request')
        if obj.banner and request:
            return request.build_absolute_uri(obj.banner.url)
        return ''

class ChronicleSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Chronicle
        fields = ['id', 'event', 'title', 'content', 'writer', 'photographer', 'image', 'image_url', 'created_at']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False, 'allow_null': True},
            'photographer': {'required': False},
            'event': {'required': False},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return ''

class SponsorSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Sponsor
        fields = ['id', 'name', 'address', 'contact', 'phone', 'description', 'url', 'image', 'image_url', 'is_active', 'created_at']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False, 'allow_null': True},
            'url': {'required': False, 'allow_blank': True},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return ''


class EventPostSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_date = serializers.DateTimeField(source='event.date_time', read_only=True)
    event_location = serializers.CharField(source='event.location', read_only=True)

    class Meta:
        model = EventPost
        fields = ['id', 'title', 'image', 'image_url', 'event', 'event_title', 'event_date', 'event_location', 'is_active', 'order', 'created_at']
        extra_kwargs = {
            'title': {'required': False, 'allow_blank': True},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        elif obj.image:
            return obj.image.url
        return ''

