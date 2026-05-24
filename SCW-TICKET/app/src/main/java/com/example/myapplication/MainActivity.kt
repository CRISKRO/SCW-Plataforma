package com.example.myapplication

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication.ui.theme.MyApplicationTheme
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
                    ScannerApp()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScannerApp() {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("scanner_prefs", Context.MODE_PRIVATE)

    var baseUrl by remember { mutableStateOf(prefs.getString("base_url", "https://tudominio.pythonanywhere.com") ?: "") }
    var token by remember { mutableStateOf(prefs.getString("token", "scw-default-secret-token") ?: "") }
    
    var showSettings by remember { mutableStateOf(false) }
    
    var scanResultText by remember { mutableStateOf("Presiona el botón para escanear un boleto") }
    var scanResultColor by remember { mutableStateOf(Color.Gray) }
    var isLoading by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    val scanLauncher = rememberLauncherForActivityResult(ScanContract()) { result ->
        if (result.contents == null) {
            Toast.makeText(context, "Escaneo cancelado", Toast.LENGTH_SHORT).show()
        } else {
            // Process QR content
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
                                // Try to parse error body
                                val errorBody = response.errorBody()?.string()
                                if (errorBody != null && errorBody.contains("message")) {
                                    val errJson = JSONObject(errorBody)
                                    scanResultText = errJson.optString("message", "Error de validación")
                                } else {
                                    scanResultText = "❌ Error en el servidor: ${response.code()}"
                                }
                            }
                            scanResultColor = Color(0xFFF44336) // Red
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SCW Scanner") },
                actions = {
                    IconButton(onClick = { showSettings = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Configuración")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
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
                    options.setCameraId(0) // Use specific camera of the device
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
                        label = { Text("Token de Escáner") },
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