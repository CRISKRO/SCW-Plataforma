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
    var events by remember { mutableStateOf<List<BoxOfficeEvent>>(emptyList()) }
    var selectedEvent by remember { mutableStateOf<BoxOfficeEvent?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }
    
    // QR Result State
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var sellResultText by remember { mutableStateOf("") }

    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        isLoading = true
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

    if (qrBitmap != null) {
        // Pantalla de Éxito con el QR
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "¡Venta Exitosa!", 
                fontSize = 24.sp, 
                fontWeight = FontWeight.Bold, 
                color = Color(0xFF4CAF50),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(sellResultText, fontSize = 18.sp, textAlign = TextAlign.Center)
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Image(
                bitmap = qrBitmap!!.asImageBitmap(),
                contentDescription = "Boleto QR",
                modifier = Modifier.size(300.dp)
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = { 
                    qrBitmap = null
                    selectedEvent = null 
                    // Reload events optionally
                },
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Siguiente Venta")
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Taquilla - Venta en Efectivo", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
        } else if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = Color.Red)
        } else if (events.isEmpty()) {
            Text("No hay eventos disponibles con lugares.")
        } else {
            LazyColumn {
                if (selectedEvent == null) {
                    items(events) { event ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp)
                                .clickable { selectedEvent = event },
                            elevation = CardDefaults.cardElevation(4.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(event.title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                                Text(event.date, color = Color.Gray)
                                Text("Zonas disponibles: ${event.zones.size}", color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                } else {
                    item {
                        Button(onClick = { selectedEvent = null }) {
                            Text("← Volver a Eventos")
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Evento: ${selectedEvent!!.title}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    
                    items(selectedEvent!!.zones) { zone ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            elevation = CardDefaults.cardElevation(2.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(zone.name, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                                    Text("$${zone.price} MXN", color = Color(0xFF4CAF50))
                                    Text("${zone.available_seats} disponibles", fontSize = 12.sp, color = Color.Gray)
                                }
                                
                                Button(
                                    onClick = {
                                        isLoading = true
                                        coroutineScope.launch {
                                            try {
                                                val api = ApiClient.getService(baseUrl)
                                                val res = api.sellBoxOfficeTicket(token, SellRequest(selectedEvent!!.id, zone.id))
                                                if (res.isSuccessful && res.body() != null) {
                                                    val body = res.body()!!
                                                    if (body.success) {
                                                        // Generate QR content
                                                        val qrContent = "{\"scw\":true,\"order\":${body.order_id},\"item\":${body.item_id},\"code\":\"${body.code}\"}"
                                                        try {
                                                            val encoder = BarcodeEncoder()
                                                            qrBitmap = encoder.encodeBitmap(qrContent, BarcodeFormat.QR_CODE, 600, 600)
                                                            sellResultText = "${body.event_title}\n${body.seat_info}\nTotal: $${body.price}"
                                                        } catch (e: Exception) {
                                                            errorMsg = "Error generando QR"
                                                        }
                                                    } else {
                                                        errorMsg = body.error ?: "Error desconocido"
                                                    }
                                                } else {
                                                    errorMsg = "Error al vender: ${res.code()}"
                                                }
                                            } catch (e: Exception) {
                                                errorMsg = "Error de conexión: ${e.message}"
                                            } finally {
                                                isLoading = false
                                            }
                                        }
                                    }
                                ) {
                                    Text("Vender")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}