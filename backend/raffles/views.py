from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Raffle, RaffleTicket
from .serializers import RaffleSerializer, RaffleTicketSerializer
import json

class RaffleViewSet(viewsets.ModelViewSet):
    queryset = Raffle.objects.all()
    serializer_class = RaffleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def toggle_ticket(self, request, pk=None):
        """
        Custom endpoint for admins to mark a ticket as SOLD_OFFLINE or back to AVAILABLE
        """
        raffle = self.get_object()
        ticket_id = request.data.get('ticket_id')
        new_status = request.data.get('status')
        buyer_name = request.data.get('buyer_name', '')

        if not ticket_id or not new_status:
            return Response({'detail': 'ticket_id and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ticket = raffle.tickets.get(id=ticket_id)
        except RaffleTicket.DoesNotExist:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        if new_status not in [RaffleTicket.Status.AVAILABLE, RaffleTicket.Status.SOLD_OFFLINE, RaffleTicket.Status.SOLD_ONLINE]:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = new_status
        ticket.buyer_name = buyer_name
        ticket.save()

        return Response({'detail': 'Ticket updated successfully', 'ticket': RaffleTicketSerializer(ticket).data})
