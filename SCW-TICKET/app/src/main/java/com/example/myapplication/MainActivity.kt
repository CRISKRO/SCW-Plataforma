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
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
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
import com.example.myapplication.ui.theme.*
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch
import org.json.JSONObject
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.print.PrintHelper
import java.io.File
import java.io.FileOutputStream
import androidx.compose.material.icons.filled.Share

fun createReceiptBitmap(qr: Bitmap, text: String): Bitmap {
    val textLines = text.split("\n")
    val textPaint = Paint().apply {
        color = android.graphics.Color.BLACK
        textSize = 30f
        isAntiAlias = true
        textAlign = Paint.Align.CENTER
    }
    
    val padding = 40
    val lineHeight = 40
    val textHeight = textLines.size * lineHeight
    val width = 600
    val height = padding + textHeight + padding + qr.height + padding
    
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(android.graphics.Color.WHITE)
    
    var y = padding.toFloat() + 30f // baseline
    for (line in textLines) {
        val x = width / 2f
        canvas.drawText(line, x, y, textPaint)
        y += lineHeight
    }
    
    val qrX = (width - qr.width) / 2f
    canvas.drawBitmap(qr, qrX, y - 30f + padding.toFloat(), null)
    
    return bitmap
}

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
        containerColor = SCWBlack,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SCWBlack,
                    titleContentColor = SCWTextWhite,
                    actionIconContentColor = SCWTextWhite
                ),
                title = { Text(if (selectedTab == 0) "SCW Escáner" else "SCW Taquilla", fontWeight = FontWeight.Black) },
                actions = {
                    IconButton(onClick = { showSettings = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Configuración")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = SCWBlack,
                contentColor = SCWTextWhite
            ) {
                NavigationBarItem(
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SCWTextWhite,
                        unselectedIconColor = SCWTextGray,
                        selectedTextColor = SCWTextWhite,
                        unselectedTextColor = SCWTextGray,
                        indicatorColor = SCWRed
                    ),
                    icon = { Icon(Icons.Default.Home, contentDescription = "Escanear") },
                    label = { Text("Escanear", fontWeight = FontWeight.Bold) },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = SCWTextWhite,
                        unselectedIconColor = SCWTextGray,
                        selectedTextColor = SCWTextWhite,
                        unselectedTextColor = SCWTextGray,
                        indicatorColor = SCWRed
                    ),
                    icon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Taquilla") },
                    label = { Text("Taquilla", fontWeight = FontWeight.Bold) },
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
            containerColor = SCWSurface,
            titleContentColor = SCWTextWhite,
            textContentColor = SCWTextWhite,
            title = { Text("Configuración", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    OutlinedTextField(
                        value = baseUrl,
                        onValueChange = { baseUrl = it },
                        label = { Text("URL del Servidor", color = SCWTextGray) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = SCWTextWhite,
                            unfocusedTextColor = SCWTextWhite,
                            focusedBorderColor = SCWRed,
                            unfocusedBorderColor = SCWBorder,
                            cursorColor = SCWRed
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = token,
                        onValueChange = { token = it },
                        label = { Text("Token de Acceso", color = SCWTextGray) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = SCWTextWhite,
                            unfocusedTextColor = SCWTextWhite,
                            focusedBorderColor = SCWRed,
                            unfocusedBorderColor = SCWBorder,
                            cursorColor = SCWRed
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = SCWRed, contentColor = SCWTextWhite),
                    onClick = {
                    prefs.edit()
                        .putString("base_url", baseUrl)
                        .putString("token", token)
                        .apply()
                    showSettings = false
                    Toast.makeText(context, "Configuración guardada", Toast.LENGTH_SHORT).show()
                }) {
                    Text("Guardar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettings = false }) {
                    Text("Cancelar", color = SCWTextGray)
                }
            }
        )
    }
}

@Composable
fun ScannerTab(baseUrl: String, token: String) {
    val context = LocalContext.current
    var scanResultText by remember { mutableStateOf("Presiona el botón para escanear un boleto") }
    var scanResultColor by remember { mutableStateOf(SCWTextGray) }
    var isLoading by remember { mutableStateOf(false) }

    var dojoStudent by remember { mutableStateOf<DojoStudentResponse?>(null) }
    var dojoChargeAmount by remember { mutableStateOf("") }

    val coroutineScope = rememberCoroutineScope()

    val scanLauncher = rememberLauncherForActivityResult(ScanContract()) { result ->
        if (result.contents == null) {
            Toast.makeText(context, "Escaneo cancelado", Toast.LENGTH_SHORT).show()
        } else {
            try {
                val json = JSONObject(result.contents)
                if (json.has("dojo_student") && json.getBoolean("dojo_student")) {
                    val studentId = json.getInt("id")
                    isLoading = true
                    scanResultText = "Buscando alumno..."
                    scanResultColor = SCWTextWhite
                    
                    coroutineScope.launch {
                        try {
                            val api = ApiClient.getService(baseUrl)
                            val response = api.getDojoStudentStatus(studentId, token)
                            if (response.isSuccessful && response.body() != null) {
                                val body = response.body()!!
                                if (body.valid) {
                                    dojoStudent = body
                                    scanResultText = "Alumno: ${body.name}\nSaldo: $${body.outstanding_balance}"
                                    scanResultColor = SCWGreen
                                } else {
                                    scanResultText = body.message ?: "Alumno no encontrado"
                                    scanResultColor = SCWRed
                                }
                            } else {
                                scanResultText = "❌ Error en el servidor: ${response.code()}"
                                scanResultColor = SCWRed
                            }
                        } catch (e: Exception) {
                            scanResultText = "❌ Error de conexión: ${e.message}"
                            scanResultColor = SCWRed
                        } finally {
                            isLoading = false
                        }
                    }
                } else {
                    val orderId = json.getInt("order")
                    val itemId = json.getInt("item")
                    val code = json.getString("code")

                    isLoading = true
                    scanResultText = "Validando boleto..."
                    scanResultColor = SCWTextWhite

                    coroutineScope.launch {
                        try {
                            val api = ApiClient.getService(baseUrl)
                            val request = ValidationRequest(order_id = orderId, item_id = itemId, code = code)
                            val response = api.validateTicket(token, request)

                            if (response.isSuccessful && response.body() != null) {
                                val body = response.body()!!
                                if (body.valid) {
                                    scanResultText = "${body.message}\n${body.item ?: ""} (${body.size ?: ""})"
                                    scanResultColor = SCWGreen // Green
                                } else {
                                    scanResultText = body.message
                                    scanResultColor = SCWRed // Red
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
                                scanResultColor = SCWRed
                            }
                        } catch (e: Exception) {
                            scanResultText = "❌ Error de conexión: ${e.message}"
                            scanResultColor = SCWRed
                        } finally {
                            isLoading = false
                        }
                    }
                }
            } catch (e: Exception) {
                scanResultText = "❌ QR Inválido o formato desconocido"
                scanResultColor = SCWRed
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
                .background(SCWGlass, RoundedCornerShape(16.dp))
                .border(1.dp, SCWBorder, RoundedCornerShape(16.dp))
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = SCWRed)
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
                options.setCaptureActivity(PortraitCaptureActivity::class.java)
                options.setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                options.setPrompt("Escanea el código QR del boleto")
                options.setCameraId(0)
                options.setBeepEnabled(true)
                options.setBarcodeImageEnabled(false)
                options.setOrientationLocked(true)
                scanLauncher.launch(options)
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SCWRed, contentColor = SCWTextWhite),
            shape = RoundedCornerShape(30.dp)
        ) {
            Text("ESCANEAR BOLETO / QR", fontSize = 16.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
        }
    }

    if (dojoStudent != null) {
        AlertDialog(
            onDismissRequest = { dojoStudent = null; dojoChargeAmount = "" },
            containerColor = SCWSurface,
            titleContentColor = SCWTextWhite,
            textContentColor = SCWTextWhite,
            title = { Text("Cobrar Mensualidad/Abono", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Alumno: ${dojoStudent!!.name}", fontWeight = FontWeight.Bold)
                    Text("Estado: ${dojoStudent!!.payment_status}")
                    Text("Saldo pendiente: $${dojoStudent!!.outstanding_balance} MXN", color = SCWRed, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = dojoChargeAmount,
                        onValueChange = { dojoChargeAmount = it },
                        label = { Text("Monto a cobrar (vacío = todo)", color = SCWTextGray) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = SCWTextWhite,
                            unfocusedTextColor = SCWTextWhite,
                            focusedBorderColor = SCWRed,
                            unfocusedBorderColor = SCWBorder,
                            cursorColor = SCWRed
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = SCWRed, contentColor = SCWTextWhite),
                    onClick = {
                    val amount = dojoChargeAmount.toFloatOrNull()
                    val sId = dojoStudent!!.id!!
                    dojoStudent = null
                    dojoChargeAmount = ""
                    isLoading = true
                    scanResultText = "Registrando pago..."
                    scanResultColor = SCWTextWhite
                    
                    coroutineScope.launch {
                        try {
                            val api = ApiClient.getService(baseUrl)
                            val req = DojoPaymentRequest(amount = amount)
                            val res = api.registerDojoPayment(sId, token, req)
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                if (body.success) {
                                    scanResultText = "✅ ${body.message}"
                                    scanResultColor = SCWGreen
                                } else {
                                    scanResultText = "❌ ${body.error ?: "Error"}"
                                    scanResultColor = SCWRed
                                }
                            } else {
                                scanResultText = "❌ Error servidor: ${res.code()}"
                                scanResultColor = SCWRed
                            }
                        } catch(e: Exception) {
                            scanResultText = "❌ Error de red: ${e.message}"
                            scanResultColor = SCWRed
                        } finally {
                            isLoading = false
                        }
                    }
                }) {
                    Text("Registrar Pago", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { dojoStudent = null; dojoChargeAmount = "" }) {
                    Text("Cancelar", color = SCWTextGray)
                }
            }
        )
    }
}

@Composable
fun BoxOfficeTab(baseUrl: String, token: String) {
    var tabIndex by remember { mutableIntStateOf(0) }
    
    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = tabIndex,
            containerColor = SCWBlack,
            contentColor = SCWTextWhite,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    Modifier.tabIndicatorOffset(tabPositions[tabIndex]),
                    color = SCWRed
                )
            }
        ) {
            Tab(selected = tabIndex == 0, onClick = { tabIndex = 0 }, text = { Text("EVENTOS", fontWeight = FontWeight.Bold, color = if (tabIndex == 0) SCWRed else SCWTextGray) })
            Tab(selected = tabIndex == 1, onClick = { tabIndex = 1 }, text = { Text("RIFAS", fontWeight = FontWeight.Bold, color = if (tabIndex == 1) SCWRed else SCWTextGray) })
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
    val context = LocalContext.current
    var events by remember { mutableStateOf<List<BoxOfficeEvent>>(emptyList()) }
    var selectedEvent by remember { mutableStateOf<BoxOfficeEvent?>(null) }
    var showMap by remember { mutableStateOf(false) }
    var seatToSell by remember { mutableStateOf<Pair<BoxOfficeZone, BoxOfficeSeat>?>(null) }
    var generalZoneToSell by remember { mutableStateOf<BoxOfficeZone?>(null) }
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
            Text("¡Venta Exitosa!", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = SCWGreen, modifier = Modifier.padding(bottom = 8.dp))
            Text(sellResultText, fontSize = 18.sp, textAlign = TextAlign.Center, color = SCWTextWhite)
            Spacer(modifier = Modifier.height(24.dp))
            Image(bitmap = qrBitmap!!.asImageBitmap(), contentDescription = "Boleto QR", modifier = Modifier.size(300.dp).background(Color.White).padding(8.dp))
            Spacer(modifier = Modifier.height(32.dp))
            
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    modifier = Modifier.weight(1f).height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SCWDarkGray, contentColor = Color.White),
                    onClick = {
                        val receipt = createReceiptBitmap(qrBitmap!!, sellResultText)
                        PrintHelper(context).apply {
                            scaleMode = PrintHelper.SCALE_MODE_FIT
                        }.printBitmap("Boleto SCW", receipt)
                    }
                ) { Text("Imprimir", fontWeight = FontWeight.Bold) }
                
                Button(
                    modifier = Modifier.weight(1f).height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SCWDarkGray, contentColor = Color.White),
                    onClick = {
                        val receipt = createReceiptBitmap(qrBitmap!!, sellResultText)
                        try {
                            val imagesDir = File(context.cacheDir, "images")
                            imagesDir.mkdirs()
                            val file = File(imagesDir, "ticket.png")
                            val out = FileOutputStream(file)
                            receipt.compress(Bitmap.CompressFormat.PNG, 100, out)
                            out.flush()
                            out.close()
                            
                            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "image/png"
                                putExtra(Intent.EXTRA_STREAM, uri)
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            context.startActivity(Intent.createChooser(intent, "Compartir Boleto"))
                        } catch (e: Exception) {
                            errorMsg = "Error al compartir: ${e.message}"
                        }
                    }
                ) { Text("Compartir", fontWeight = FontWeight.Bold) }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                colors = ButtonDefaults.buttonColors(containerColor = SCWRed, contentColor = SCWTextWhite),
                onClick = { qrBitmap = null; selectedEvent = null; loadEvents() }, 
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Siguiente Venta", fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    if (seatToSell != null) {
        val (zone, seat) = seatToSell!!
        AlertDialog(
            onDismissRequest = { seatToSell = null },
            containerColor = SCWSurface,
            titleContentColor = SCWTextWhite,
            textContentColor = SCWTextWhite,
            title = { Text("Confirmar Venta", fontWeight = FontWeight.Bold) },
            text = { Text("¿Deseas vender el asiento de la zona ${zone.name}, Fila ${seat.row} - ${seat.number} por $${zone.price} MXN?") },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = SCWGreen, contentColor = SCWTextWhite),
                    onClick = {
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
                                        sellResultText = "${body.event_title}\n${body.seat_info}\nTotal: $${body.price}"
                                    } catch (e: Exception) { errorMsg = "Error generando QR" }
                                } else { errorMsg = body.error ?: "Error desconocido" }
                            } else { errorMsg = "Error al vender: ${res.code()}" }
                        } catch (e: Exception) { errorMsg = "Error de red: ${e.message}" } finally { isLoading = false }
                    }
                }) { Text("Confirmar y Cobrar", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { seatToSell = null }) { Text("Cancelar", color = SCWTextGray) } }
        )
    }

    if (generalZoneToSell != null) {
        val zone = generalZoneToSell!!
        AlertDialog(
            onDismissRequest = { generalZoneToSell = null },
            containerColor = SCWSurface,
            titleContentColor = SCWTextWhite,
            textContentColor = SCWTextWhite,
            title = { Text("Confirmar Venta", fontWeight = FontWeight.Bold) },
            text = { Text("¿Deseas vender un boleto General por $${zone.price} MXN?") },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = SCWGreen, contentColor = SCWTextWhite),
                    onClick = {
                    generalZoneToSell = null
                    isLoading = true
                    coroutineScope.launch {
                        try {
                            val api = ApiClient.getService(baseUrl)
                            val res = api.sellBoxOfficeTicket(token, SellRequest(event_id = selectedEvent!!.id, zone_id = zone.id))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                if (body.success) {
                                    val qrContent = "{\"scw\":true,\"order\":${body.order_id},\"item\":${body.item_id},\"code\":\"${body.code}\"}"
                                    try {
                                        qrBitmap = BarcodeEncoder().encodeBitmap(qrContent, BarcodeFormat.QR_CODE, 600, 600)
                                        sellResultText = "${body.event_title}\n${body.seat_info}\nTotal: $${body.price}"
                                    } catch (e: Exception) { errorMsg = "Error generando QR" }
                                } else { errorMsg = body.error ?: "Error desconocido" }
                            } else { errorMsg = "Error al vender: ${res.code()}" }
                        } catch (e: Exception) { errorMsg = "Error de red: ${e.message}" } finally { isLoading = false }
                    }
                }) { Text("Confirmar y Cobrar", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { generalZoneToSell = null }) { Text("Cancelar", color = SCWTextGray) } }
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("VENTA EN EFECTIVO", fontSize = 20.sp, fontWeight = FontWeight.Black, color = SCWTextWhite, letterSpacing = 1.sp)
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            CircularProgressIndicator(color = SCWRed, modifier = Modifier.align(Alignment.CenterHorizontally))
        } else if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = SCWRed)
        } else if (selectedEvent == null) {
            if (events.isEmpty()) Text("No hay eventos disponibles.", color = SCWTextGray)
            else LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(events) { event ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { selectedEvent = event },
                        colors = CardDefaults.cardColors(containerColor = SCWGlass),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(0.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SCWBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(event.title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
                            Text(event.date, color = SCWRed, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        } else if (!showMap) {
            Button(
                colors = ButtonDefaults.buttonColors(containerColor = SCWDarkGray, contentColor = SCWTextWhite),
                onClick = { selectedEvent = null }
            ) { Text("← Volver a Eventos") }
            Spacer(modifier = Modifier.height(16.dp))
            Text(selectedEvent!!.title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
            Text("Selecciona el tipo de boleto a vender:", color = SCWTextGray)
            Spacer(modifier = Modifier.height(16.dp))
            
            val generalZone = selectedEvent!!.zones.find { it.name.contains("General", true) }
            val numberedZones = selectedEvent!!.zones.filter { !it.name.contains("General", true) }
            
            if (generalZone != null) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable {
                        generalZoneToSell = generalZone
                    },
                    colors = CardDefaults.cardColors(containerColor = SCWGlass),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SCWBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("General", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
                        Text("Vender un boleto sin asiento asignado", color = SCWTextGray)
                        Text("$${generalZone.price} MXN", color = SCWRed, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top=8.dp))
                    }
                }
            }
            
            if (numberedZones.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { showMap = true },
                    colors = CardDefaults.cardColors(containerColor = SCWGlass),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SCWBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Primera / Segunda Fila", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
                        Text("Seleccionar un asiento numerado en el mapa", color = SCWTextGray)
                        if (numberedZones.isNotEmpty()) {
                            Text("$${numberedZones[0].price} MXN", color = SCWRed, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top=8.dp))
                        }
                    }
                }
            }
        } else {
            Button(
                colors = ButtonDefaults.buttonColors(containerColor = SCWDarkGray, contentColor = SCWTextWhite),
                onClick = { showMap = false }
            ) { Text("← Volver a Opciones") }
            Spacer(modifier = Modifier.height(16.dp))
            Text(selectedEvent!!.title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
            Text("Selecciona un asiento del mapa", color = SCWTextGray)
            Spacer(modifier = Modifier.height(16.dp))

            // Box for the 2D pan/zoom Map
            Box(modifier = Modifier.fillMaxSize().background(SCWBlack).border(1.dp, SCWBorder, RoundedCornerShape(8.dp))) {
                // To keep it simple, we use scrollable Column & Row
                var scale by remember { mutableFloatStateOf(1f) }
                // Implementation using simple scrollbars for panning
                val hScroll = rememberScrollState()
                val vScroll = rememberScrollState()
                
                Box(modifier = Modifier.fillMaxSize().horizontalScroll(hScroll).verticalScroll(vScroll).padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // OESTE
                            val oeste = selectedEvent!!.zones.find { it.name.contains("OESTE", ignoreCase = true) }
                            if (oeste != null) ZoneView(oeste, isVertical = true, reverseRows = true) { seat -> seatToSell = Pair(oeste, seat) }
                            
                            Spacer(modifier = Modifier.width(32.dp))
                            
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                // NORTE
                                val norte = selectedEvent!!.zones.find { it.name.contains("NORTE", ignoreCase = true) }
                                if (norte != null) ZoneView(norte, reverseRows = true) { seat -> seatToSell = Pair(norte, seat) }
                                
                                Spacer(modifier = Modifier.height(4.dp))
                                
                                // RING
                                Box(modifier = Modifier.size(200.dp).background(Color(0xFF111111)).border(4.dp, SCWRed).padding(8.dp), contentAlignment = Alignment.Center) {
                                    Text("RING SCW", fontWeight = FontWeight.Black, color = Color.White, fontSize = 24.sp, letterSpacing = 2.sp)
                                }
                                
                                Spacer(modifier = Modifier.height(4.dp))
                                
                                // SUR
                                val sur = selectedEvent!!.zones.find { it.name.contains("SUR", ignoreCase = true) }
                                if (sur != null) ZoneView(sur) { seat -> seatToSell = Pair(sur, seat) }
                            }
                            
                            Spacer(modifier = Modifier.width(32.dp))
                            
                            // ESTE
                            val este = selectedEvent!!.zones.find { it.name.contains("ESTE", ignoreCase = true) }
                            if (este != null) ZoneView(este, isVertical = true) { seat -> seatToSell = Pair(este, seat) }
                        }
                        
                        // OTHERS
                        val others = selectedEvent!!.zones.filter { !it.name.contains("NORTE", true) && !it.name.contains("SUR", true) && !it.name.contains("ESTE", true) && !it.name.contains("OESTE", true) }
                        others.forEach { zone ->
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(zone.name, fontWeight = FontWeight.Bold, color = SCWTextWhite)
                            ZoneView(zone) { seat -> seatToSell = Pair(zone, seat) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ZoneView(zone: BoxOfficeZone, isVertical: Boolean = false, reverseRows: Boolean = false, onSeatClick: (BoxOfficeSeat) -> Unit) {
    val isReverse = zone.name.contains("SUR", ignoreCase = true)
    
    val seatsByRow = zone.seats.groupBy { it.row ?: "?" }.mapValues { entry ->
        if (isReverse) {
            entry.value.sortedByDescending { it.number }
        } else {
            entry.value.sortedBy { it.number }
        }
    }
    
    fun getDisplayNumber(zoneType: String, seatNumber: Int): Int {
        val upType = zoneType.uppercase()
        if (upType.contains("NORTE")) return seatNumber
        if (upType.contains("OESTE")) return seatNumber + 44
        if (upType.contains("ESTE")) return seatNumber + 17
        if (upType.contains("SUR")) return seatNumber + 27
        return seatNumber
    }
    
    val rowEntries = if (reverseRows) seatsByRow.entries.reversed() else seatsByRow.entries

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(4.dp)) {
        Text(zone.name, fontWeight = FontWeight.Bold, color = SCWTextWhite)
        Text("$${zone.price}", color = SCWGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        
        if (isVertical) {
            Row(horizontalArrangement = Arrangement.Center) {
                rowEntries.forEach { (rowName, seats) ->
                    Column(modifier = Modifier.padding(horizontal = 2.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(rowName, fontWeight = FontWeight.Bold, modifier = Modifier.height(20.dp), fontSize = 10.sp, color = SCWTextGray)
                        Spacer(modifier = Modifier.height(2.dp))
                        seats.forEach { seat ->
                            Box(
                                modifier = Modifier.size(24.dp).padding(1.dp)
                                    .background(if (seat.is_available) SCWGreen else SCWSurface, RoundedCornerShape(4.dp))
                                    .border(1.dp, if (seat.is_available) SCWGreen else SCWBorder, RoundedCornerShape(4.dp))
                                    .clickable(enabled = seat.is_available) { onSeatClick(seat) },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(getDisplayNumber(zone.name, seat.number).toString(), color = if (seat.is_available) SCWBlack else SCWTextGray, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        } else {
            rowEntries.forEach { (rowName, seats) ->
                Row(modifier = Modifier.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(rowName, fontWeight = FontWeight.Bold, modifier = Modifier.width(20.dp), fontSize = 10.sp, color = SCWTextGray)
                    Spacer(modifier = Modifier.width(2.dp))
                    seats.forEach { seat ->
                        Box(
                            modifier = Modifier.size(24.dp).padding(1.dp)
                                .background(if (seat.is_available) SCWGreen else SCWSurface, RoundedCornerShape(4.dp))
                                .border(1.dp, if (seat.is_available) SCWGreen else SCWBorder, RoundedCornerShape(4.dp))
                                .clickable(enabled = seat.is_available) { onSeatClick(seat) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(getDisplayNumber(zone.name, seat.number).toString(), color = if (seat.is_available) SCWBlack else SCWTextGray, fontSize = 8.sp, fontWeight = FontWeight.Bold)
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
    var buyerPhone by remember { mutableStateOf("") }
    
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
            containerColor = SCWSurface,
            titleContentColor = SCWTextWhite,
            textContentColor = SCWTextWhite,
            title = { Text("Vender Boleto #${ticketToSell!!.number}", fontWeight = FontWeight.Bold) },
            text = { 
                Column {
                    Text("Total a cobrar: $${selectedRaffle!!.price} MXN", color = SCWGreen, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = buyerName,
                        onValueChange = { buyerName = it },
                        label = { Text("Nombre del comprador", color = SCWTextGray) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = SCWTextWhite,
                            unfocusedTextColor = SCWTextWhite,
                            focusedBorderColor = SCWRed,
                            unfocusedBorderColor = SCWBorder,
                            cursorColor = SCWRed
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = buyerPhone,
                        onValueChange = { buyerPhone = it },
                        label = { Text("Teléfono del comprador", color = SCWTextGray) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = SCWTextWhite,
                            unfocusedTextColor = SCWTextWhite,
                            focusedBorderColor = SCWRed,
                            unfocusedBorderColor = SCWBorder,
                            cursorColor = SCWRed
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = SCWGreen, contentColor = SCWTextWhite),
                    onClick = {
                    val tId = ticketToSell!!.id
                    val name = buyerName
                    val phone = buyerPhone
                    ticketToSell = null
                    isLoading = true
                    coroutineScope.launch {
                        try {
                            val res = ApiClient.getService(baseUrl).sellBoxOfficeRaffleTicket(token, SellRaffleRequest(tId, name, phone))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                if (body.success == true) {
                                    successMsg = "Venta del boleto #${body.number} exitosa!"
                                    loadRaffles()
                                } else { errorMsg = body.error ?: "Error" }
                            } else { errorMsg = "Error: ${res.code()}" }
                        } catch (e: Exception) { errorMsg = "Error de red: ${e.message}" } finally { isLoading = false }
                    }
                }) { Text("Confirmar Venta", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { ticketToSell = null }) { Text("Cancelar", color = SCWTextGray) } }
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("RIFAS - VENTA EN EFECTIVO", fontSize = 20.sp, fontWeight = FontWeight.Black, color = SCWTextWhite, letterSpacing = 1.sp)
        Spacer(modifier = Modifier.height(16.dp))

        if (successMsg.isNotEmpty()) {
            Text(successMsg, color = SCWGreen, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
            Button(
                colors = ButtonDefaults.buttonColors(containerColor = SCWDarkGray, contentColor = SCWTextWhite),
                onClick = { successMsg = "" }
            ) { Text("Aceptar") }
            Spacer(modifier = Modifier.height(16.dp))
        }

        if (isLoading) {
            CircularProgressIndicator(color = SCWRed, modifier = Modifier.align(Alignment.CenterHorizontally))
        } else if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = SCWRed)
        } else if (selectedRaffle == null) {
            if (raffles.isEmpty()) Text("No hay rifas activas.", color = SCWTextGray)
            else LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(raffles) { raffle ->
                    val available = raffle.tickets.count { it.status == "AVAILABLE" }
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { selectedRaffle = raffle },
                        colors = CardDefaults.cardColors(containerColor = SCWGlass),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(0.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SCWBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(raffle.title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
                            Text("Precio: $${raffle.price} MXN", color = SCWGreen, fontWeight = FontWeight.Bold)
                            Text("Disponibles: $available / ${raffle.tickets.size}", color = SCWTextGray)
                        }
                    }
                }
            }
        } else {
            val raffle = selectedRaffle
            if (raffle != null) {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = SCWDarkGray, contentColor = SCWTextWhite),
                    onClick = { selectedRaffle = null; buyerName = ""; buyerPhone = "" }
                ) { Text("← Volver a Rifas") }
                Spacer(modifier = Modifier.height(16.dp))
                Text(raffle.title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SCWTextWhite)
                Text("Precio: $${raffle.price} MXN", color = SCWGreen, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
    
                LazyColumn {
                    // Grid of tickets: approx 5 per row
                    items(raffle.tickets.chunked(5)) { rowTickets ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            rowTickets.forEach { ticket ->
                                val isAvailable = ticket.status == "AVAILABLE"
                                Box(
                                    modifier = Modifier.size(50.dp).padding(4.dp)
                                        .background(if (isAvailable) SCWGreen.copy(alpha=0.1f) else SCWRed.copy(alpha=0.1f), RoundedCornerShape(8.dp))
                                        .border(1.dp, if (isAvailable) SCWGreen else SCWRed.copy(alpha=0.5f), RoundedCornerShape(8.dp))
                                        .clickable(enabled = isAvailable) { ticketToSell = ticket; buyerName = ""; buyerPhone = "" },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(ticket.number.toString(), fontWeight = FontWeight.Bold, color = if (isAvailable) SCWGreen else SCWRed)
                            }
                        }
                    }
                }
            }
            }
        }
    }
}
