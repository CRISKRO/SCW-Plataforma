from django import forms
from events.models import Event, Wrestler

class EventForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = ['title', 'date', 'description', 'image']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'date': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }

class WrestlerForm(forms.ModelForm):
    class Meta:
        model = Wrestler
        fields = ['name', 'bio', 'image', 'height', 'weight', 'finisher']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'bio': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
            'height': forms.TextInput(attrs={'class': 'form-control'}),
            'weight': forms.TextInput(attrs={'class': 'form-control'}),
            'finisher': forms.TextInput(attrs={'class': 'form-control'}),
        }
