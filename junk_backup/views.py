from django.shortcuts import render
from events.models import Event
from news.models import Article

def home(request):
    upcoming_events = Event.objects.all()[:3]
    latest_news = Article.objects.all()[:3]
    return render(request, 'core/home.html', {
        'upcoming_events': upcoming_events,
        'latest_news': latest_news,
    })
