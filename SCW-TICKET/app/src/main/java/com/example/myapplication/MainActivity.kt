package com.example.myapplication

import android.content.Context
import android.graphics.Bitmap
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication.ui.theme.MyApplicationTheme
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainAppScreen()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen() {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("scanner_prefs", Context.MODE_PRIVATE)

    var baseUrl by remember { mutableStateOf(prefs.getString("base_url", "https://tudominio.pythonanywhere.com") ?: "") }
    var token by remember { mutableStateOf(prefs.getString("token", "scw-default-secret-token") ?: "") }
    var showSettings by remember { mutableStateOf(false) }
    
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (selectedTab == 0) "SCW Escáner" else "SCW Taquilla") },
                actions = {
                    IconButton(onClick = { showSettings = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Configuración")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Escanear") },
                    label = { Text("Escanear") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Taquilla") },
                    label = { Text("Taquilla") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            if (selectedTab == 0) {
                ScannerTab(baseUrl = baseUrl, token = token)
            } else {
                BoxOfficeTab(baseUrl = baseUrl, token = token)
            }
        }
    }

    if (showSettings) {
        AlertDialog(
            onDismissRequest = { showSettings = false },
            title = { Text("Configuración") },
            text = {
                Column {
                    OutlinedTextField(
                        value = baseUrl,
                        onValueChange = { baseUrl = it },
                        label = { Text("URL del Servidor") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = token,
                        onValueChange = { token = it },
                        label = { Text("Token de Acceso") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    prefs.edit()
                        .putString("base_url", baseUrl)
                        .putString("token", token)
                        .apply()
                    showSettings = false
                    Toast.makeText(context, "Configuración guardada", Toast.LENGTH_SHORT).show()
                }) {
                    Text("Guardar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettings = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
fun ScannerTab(baseUrl: String, token: String) {
    val context = LocalContext.current
    var scanResultText by remember { mutableStateOf("Presiona el botón para escanear un boleto") }
    var scanResultColor by remember { mutableStateOf(Color.Gray) }
    var isLoading by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    val scanLauncher = rememberLauncherForActivityResult(ScanContract()) { result ->
        if (result.contents == null) {
            Toast.makeText(context, "Escaneo cancelado", Toast.LENGTH_SHORT).show()
        } else {
            try {
                val json = JSONObject(result.contents)
                val orderId = json.getInt("order")
                val itemId = json.getInt("item")
                val code = json.getString("code")

                isLoading = true
                scanResultText = "Validando boleto..."
                scanResultColor = Color.Blue

                coroutineScope.launch {
                    try {
                        val api = ApiClient.getService(baseUrl)
                        val request = ValidationRequest(order_id = orderId, item_id = itemId, code = code)
                        val response = api.validateTicket(token, request)

                        if (response.isSuccessful && response.body() != null) {
                            val body = response.body()!!
                            if (body.valid) {
                                scanResultText = "${body.message}\n${body.item ?: ""} (${body.size ?: ""})"
                                scanResultColor = Color(0xFF4CAF50) // Green
                            } else {
                                scanResultText = body.message
                                scanResultColor = Color(0xFFF44336) // Red
                            }
                        } else {
                            if (response.code() == 403) {
                                scanResultText = "❌ Error 403: Token inválido."
                            } else {
                                val errorBody = response.errorBody()?.string()
                                if (errorBody != null && errorBody.contains("message")) {
                                    val errJson = JSONObject(errorBody)
                                    scanResultText = errJson.optString("message", "Error de validación")
                                } else {
                                    scanResultText = "❌ Error en el servidor: ${response.code()}"
                                }
                            }
                            scanResultColor = Color(0xFFF44336)
                        }
                    } catch (e: Exception) {
                        scanResultText = "❌ Error de conexión: ${e.message}"
                        scanResultColor = Color.Red
                    } finally {
                        isLoading = false
                    }
                }

            } catch (e: Exception) {
                scanResultText = "❌ QR Inválido o formato desconocido"
                scanResultColor = Color.Red
                isLoading = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .background(scanResultColor.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator()
            } else {
                Text(
                    text = scanResultText,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = scanResultColor,
                    textAlign = TextAlign.Center
                )
            }
        }

        Spacer(modifier = Modifier.height(48.dp))

        Button(
            onClick = {
                val options = ScanOptions()
                options.setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                options.setPrompt("Escanea el código QR del boleto")
                options.setCameraId(0)
                options.setBeepEnabled(true)
                options.setBarcodeImageEnabled(false)
                options.setOrientationLocked(false)
                scanLauncher.launch(options)
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp),
            shape = RoundedCornerShape(30.dp)
        ) {
            Text("Escanear Boleto", fontSize = 18.sp)
        }
    }
}

@Composable
fun BoxOfficeTab(baseUrl: String, token: String) {
    var tabIndex by remember { mutableIntStateOf(0) }
    
    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = tabIndex) {
            Tab(selected = tabIndex == 0, onClick = { tabIndex = 0 }, text = { Text("Eventos") })
            Tab(selected = tabIndex == 1, onClick = { tabIndex = 1 }, text = { Text("Rifas") })
        }
        
        Box(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            if (tabIndex == 0) {
                EventsBoxOffice(baseUrl, token)
            } else {
                RafflesBoxOffice(baseUrl, token)
            }
        }
    }
}

@Composable
fun EventsBoxOffice(baseUrl: String, token: String) {
    var events by remember { mutableStateOf<List<BoxOfficeEvent>>(emptyList()) }
    var selectedEvent by remember { mutableStateOf<BoxOfficeEvent?>(null) }
    var seatToSell by remember { mutableStateOf<Pair<BoxOfficeZone, BoxOfficeSeat>?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }
    
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var sellResultText by remember { mutableStateOf("") }

    val coroutineScope = rememberCoroutineScope()

    fun loadEvents() {
        isLoading = true
        coroutineScope.launch {
            try {
                val api = ApiClient.getService(baseUrl)
                val response = api.getBoxOfficeEvents(token)
                if (response.isSuccessful && response.body() != null) {
                    events = response.body()!!
                } else {
                    errorMsg = "Error al cargar eventos: ${response.code()}"
                }
            } catch (e: Exception) {
                errorMsg = "Error de red: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { loadEvents() }

    if (qrBitmap != null) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("¡Venta Exitosa!", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4CAF50), modifier = Modifier.padding(bottom = 8.dp))
            Text(sellResultText, fontSize = 18.sp, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(24.dp))
            Image(bitmap = qrBitmap!!.asImageBitmap(), contentDescription = "Boleto QR", modifier = Modifier.size(300.dp))
            Spacer(modifier = Modifier.height(32.dp))
            Button(onClick = { qrBitmap = null; selectedEvent = null; loadEvents() }, modifier = Modifier.fillMaxWidth().height(50.dp)) {
                Text("Siguiente Venta")
            }
        }
        return
    }

    if (seatToSell != null) {
        val (zone, seat) = seatToSell!!
        AlertDialog(
            onDismissRequest = { seatToSell = null },
            title = { Text("Confirmar Venta") },
            text = { Text("¿Deseas vender el asiento de la zona ${zone.name}, Fila ${seat.row} - ${seat.number} por $${zone.price} MXN?") },
            confirmButton = {
                TextButton(onClick = {
                    seatToSell = null
                    isLoading = true
                    coroutineScope.launch {
                        try {
                            val api = ApiClient.getService(baseUrl)
                            val res = api.sellBoxOfficeTicket(token, SellRequest(selectedEvent!!.id, seat.id))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                if (body.success) {
                                    val qrContent = "{\"scw\":true,\"order\":${body.order_id},\"item\":${body.item_id},\"code\":\"${body.code}\"}"
                                    try {
                                        qrBitmap = BarcodeEncoder().encodeBitmap(qrContent, BarcodeFormat.QR_CODE, 600, 600)
                                        sellResultText = "${body.event_title}\\n${body.seat_info}\\nTotal: $${body.price}"
                                    } catch (e: Exception) { errorMsg = "Error generando QR" }
                                } else { errorMsg = body.error ?: "Error desconocido" }
                            } else { errorMsg = "Error al vender: ${res.code()}" }
                        } catch (e: Exception) { errorMsg = "Error de red: ${e.message}" } finally { isLoading = false }
                    }
                }) { Text("Confirmar y Cobrar", color = Color(0xFF4CAF50)) }
            },
            dismissButton = { TextButton(onClick = { seatToSell = null }) { Text("Cancelar") } }
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Venta en Efectivo de Boletos", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
        } else if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = Color.Red)
        } else if (selectedEvent == null) {
            if (events.isEmpty()) Text("No hay eventos disponibles.")
            else LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(events) { event ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { selectedEvent = event }, elevation = CardDefaults.cardElevation(4.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(event.title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                            Text(event.date, color = Color.Gray)
                        }
                    }
                }
            }
        } else {
            Button(onClick = { selectedEvent = null }) { Text("← Volver a Eventos") }
            Spacer(modifier = Modifier.height(16.dp))
            Text(selectedEvent!!.title, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("Mapa Completo", color = Color.Gray)
            Spacer(modifier = Modifier.height(16.dp))

            // Box for the 2D pan/zoom Map
            Box(modifier = Modifier.fillMaxSize().background(Color(0xFFEEEEEE), RoundedCornerShape(8.dp))) {
                // To keep it simple, we use scrollable Column & Row
                var scale by remember { mutableFloatStateOf(1f) }
                // Implementation using simple scrollbars for panning
                val hScroll = rememberScrollState()
                val vScroll = rememberScrollState()
                
                Box(modifier = Modifier.fillMaxSize().horizontalScroll(hScroll).verticalScroll(vScroll).padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        // NORTE
                        val norte = selectedEvent!!.zones.find { it.name.contains("NORTE", ignoreCase = true) }
                        if (norte != null) ZoneView(norte) { seat -> seatToSell = Pair(norte, seat) }
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // OESTE
                            val oeste = selectedEvent!!.zones.find { it.name.contains("OESTE", ignoreCase = true) }
                            if (oeste != null) ZoneView(oeste, isVertical = true) { seat -> seatToSell = Pair(oeste, seat) }
                            
                            // RING
                            Box(modifier = Modifier.size(150.dp).background(Color.White).border(4.dp, Color.Black).padding(8.dp), contentAlignment = Alignment.Center) {
                                Text("RING SCW", fontWeight = FontWeight.Bold, color = Color.LightGray, fontSize = 20.sp)
                            }
                            
                            // ESTE
                            val este = selectedEvent!!.zones.find { it.name.contains("ESTE", ignoreCase = true) }
                            if (este != null) ZoneView(este, isVertical = true) { seat -> seatToSell = Pair(este, seat) }
                        }
                        
                        // SUR
                        val sur = selectedEvent!!.zones.find { it.name.contains("SUR", ignoreCase = true) }
                        if (sur != null) ZoneView(sur) { seat -> seatToSell = Pair(sur, seat) }
                        
                        // OTHERS
                        val others = selectedEvent!!.zones.filter { !it.name.contains("NORTE", true) && !it.name.contains("SUR", true) && !it.name.contains("ESTE", true) && !it.name.contains("OESTE", true) }
                        others.forEach { zone ->
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(zone.name, fontWeight = FontWeight.Bold)
                            ZoneView(zone) { seat -> seatToSell = Pair(zone, seat) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ZoneView(zone: BoxOfficeZone, isVertical: Boolean = false, onSeatClick: (BoxOfficeSeat) -> Unit) {
    val seatsByRow = zone.seats.groupBy { it.row ?: "?" }
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(16.dp)) {
        Text(zone.name, fontWeight = FontWeight.Bold, color = Color.DarkGray)
        Text("$${zone.price}", color = Color(0xFF4CAF50), fontSize = 12.sp)
        Spacer(modifier = Modifier.height(8.dp))
        
        if (isVertical) {
            Row(horizontalArrangement = Arrangement.Center) {
                seatsByRow.forEach { (rowName, seats) ->
                    Column(modifier = Modifier.padding(horizontal = 2.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(rowName, fontWeight = FontWeight.Bold, modifier = Modifier.height(20.dp), fontSize = 10.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        seats.forEach { seat ->
                            Box(
                                modifier = Modifier.size(24.dp).padding(1.dp)
                                    .background(if (seat.is_available) Color(0xFF4CAF50) else Color(0xFFE0E0E0), RoundedCornerShape(2.dp))
                                    .clickable(enabled = seat.is_available) { onSeatClick(seat) },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(seat.number.toString(), color = if (seat.is_available) Color.White else Color.Gray, fontSize = 8.sp)
                            }
                        }
                    }
                }
            }
        } else {
            seatsByRow.forEach { (rowName, seats) ->
                Row(modifier = Modifier.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(rowName, fontWeight = FontWeight.Bold, modifier = Modifier.width(20.dp), fontSize = 10.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    seats.forEach { seat ->
                        Box(
                            modifier = Modifier.size(24.dp).padding(1.dp)
                                .background(if (seat.is_available) Color(0xFF4CAF50) else Color(0xFFE0E0E0), RoundedCornerShape(2.dp))
                                .clickable(enabled = seat.is_available) { onSeatClick(seat) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(seat.number.toString(), color = if (seat.is_available) Color.White else Color.Gray, fontSize = 8.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RafflesBoxOffice(baseUrl: String, token: String) {
    var raffles by remember { mutableStateOf<List<BoxOfficeRaffle>>(emptyList()) }
    var selectedRaffle by remember { mutableStateOf<BoxOfficeRaffle?>(null) }
    var ticketToSell by remember { mutableStateOf<BoxOfficeRaffleTicket?>(null) }
    var buyerName by remember { mutableStateOf("") }
    
    var isLoading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }
    var successMsg by remember { mutableStateOf("") }

    val coroutineScope = rememberCoroutineScope()

    fun loadRaffles() {
        isLoading = true
        coroutineScope.launch {
            try {
                val api = ApiClient.getService(baseUrl)
                val response = api.getBoxOfficeRaffles(token)
                if (response.isSuccessful && response.body() != null) {
                    raffles = response.body()!!
                    if (selectedRaffle != null) {
                        selectedRaffle = raffles.find { it.id == selectedRaffle!!.id }
                    }
                } else {
                    errorMsg = "Error al cargar rifas: ${response.code()}"
                }
            } catch (e: Exception) { errorMsg = "Error de red: ${e.message}" } finally { isLoading = false }
        }
    }

    LaunchedEffect(Unit) { loadRaffles() }

    if (ticketToSell != null) {
        AlertDialog(
            onDismissRequest = { ticketToSell = null },
            title = { Text("Vender Boleto #${ticketToSell!!.number}") },
            text = { 
                Column {
                    Text("Total a cobrar: $${selectedRaffle!!.price} MXN")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = buyerName,
                        onValueChange = { buyerName = it },
                        label = { Text("Nombre del comprador (opcional)") }
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val tId = ticketToSell!!.id
                    val name = buyerName
                    ticketToSell = null
                    isLoading = true
                    coroutineScope.launch {
                        try {
                            val res = ApiClient.getService(baseUrl).sellBoxOfficeRaffleTicket(token, SellRaffleRequest(tId, name))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                if (body.success == true) {
                                    successMsg = "Venta del boleto #${body.number} exitosa!"
                                    loadRaffles()
                                } else { errorMsg = body.error ?: "Error" }
                            } else { errorMsg = "Error: ${res.code()}" }
                        } catch (e: Exception) { errorMsg = "Error de red: ${e.message}" } finally { isLoading = false }
                    }
                }) { Text("Confirmar Venta") }
            },
            dismissButton = { TextButton(onClick = { ticketToSell = null }) { Text("Cancelar") } }
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Rifas - Venta en Efectivo", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        if (successMsg.isNotEmpty()) {
            Text(successMsg, color = Color(0xFF4CAF50), fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
            Button(onClick = { successMsg = "" }) { Text("Aceptar") }
            Spacer(modifier = Modifier.height(16.dp))
        }

        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
        } else if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = Color.Red)
        } else if (selectedRaffle == null) {
            if (raffles.isEmpty()) Text("No hay rifas activas.")
            else LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(raffles) { raffle ->
                    val available = raffle.tickets.count { it.status == "AVAILABLE" }
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { selectedRaffle = raffle }, elevation = CardDefaults.cardElevation(4.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(raffle.title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                            Text("Precio: $${raffle.price} MXN", color = Color(0xFF4CAF50))
                            Text("Disponibles: $available / ${raffle.tickets.size}", color = Color.Gray)
                        }
                    }
                }
            }
        } else {
            Button(onClick = { selectedRaffle = null; buyerName = "" }) { Text("← Volver a Rifas") }
            Spacer(modifier = Modifier.height(16.dp))
            Text(selectedRaffle!!.title, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("Precio: $${selectedRaffle!!.price} MXN", color = Color(0xFF4CAF50))
            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn {
                // Grid of tickets: approx 5 per row
                items(selectedRaffle!!.tickets.chunked(5)) { rowTickets ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        rowTickets.forEach { ticket ->
                            val isAvailable = ticket.status == "AVAILABLE"
                            Box(
                                modifier = Modifier.size(50.dp).padding(4.dp)
                                    .background(if (isAvailable) Color(0xFF4CAF50).copy(alpha=0.2f) else Color.Red.copy(alpha=0.2f), RoundedCornerShape(4.dp))
                                    .border(1.dp, if (isAvailable) Color(0xFF4CAF50) else Color.Red, RoundedCornerShape(4.dp))
                                    .clickable(enabled = isAvailable) { ticketToSell = ticket; buyerName = "" },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(ticket.number.toString(), fontWeight = FontWeight.Bold, color = if (isAvailable) Color(0xFF4CAF50) else Color.Red)
                            }
                        }
                    }
                }
            }
        }
    }
}
