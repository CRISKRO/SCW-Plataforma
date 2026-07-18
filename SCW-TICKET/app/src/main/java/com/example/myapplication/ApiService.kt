package com.example.myapplication

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.GET
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

// Request Body matching the QR JSON and backend endpoint requirements
data class ValidationRequest(
    val order_id: Int,
    val item_id: Int,
    val code: String
)

// Response from backend
data class ValidationResponse(
    val valid: Boolean,
    val message: String,
    val item: String? = null,
    val size: String? = null
)

// Box Office Models
data class BoxOfficeSeat(
    val id: Int,
    val row: String,
    val number: Int,
    val is_available: Boolean
)

data class BoxOfficeZone(
    val id: Int,
    val name: String,
    val price: String,
    val available_seats: Int,
    val seats: List<BoxOfficeSeat>
)

data class BoxOfficeEvent(
    val id: Int,
    val title: String,
    val date: String,
    val zones: List<BoxOfficeZone>
)

data class SellRequest(
    val event_id: Int,
    val seat_id: Int? = null,
    val seat_ids: List<Int>? = null,
    val zone_id: Int? = null,
    val quantity: Int? = null
)

data class SoldTicket(
    val item_id: Int,
    val code: String,
    val seat_info: String,
    val price: String,
    val event_title: String
)

data class SellResponse(
    val success: Boolean,
    val order_id: Int,
    val tickets: List<SoldTicket>? = null,
    val total: String? = null,
    // Retrocompatibility
    val item_id: Int? = null,
    val code: String? = null,
    val seat_info: String? = null,
    val price: String? = null,
    val event_title: String? = null,
    val error: String? = null
)

// Raffle Models
data class BoxOfficeRaffleTicket(
    val id: Int,
    val number: Int,
    val status: String,
    val buyer_name: String?
)

data class BoxOfficeRaffle(
    val id: Int,
    val title: String,
    val price: String,
    val tickets: List<BoxOfficeRaffleTicket>
)

data class SellRaffleRequest(
    val ticket_id: Int,
    val buyer_name: String,
    val buyer_phone: String
)

data class SellRaffleResponse(
    val success: Boolean?,
    val ticket_id: Int?,
    val number: Int?,
    val raffle_title: String?,
    val price: String?,
    val error: String?
)

// Dojo Models
data class DojoStudentResponse(
    val valid: Boolean,
    val id: Int?,
    val name: String?,
    val payment_status: String?,
    val payment_due_date: String?,
    val outstanding_balance: String?,
    val message: String?
)

data class DojoPaymentRequest(
    val amount: Float? = null
)

data class DojoPaymentResponse(
    val success: Boolean,
    val message: String,
    val whatsapp_sent: Boolean?,
    val error: String?
)

interface ApiService {
    @POST("api/payments/validate-ticket/")
    suspend fun validateTicket(
        @Header("X-Scanner-Token") token: String,
        @Body request: ValidationRequest
    ): Response<ValidationResponse>

    @GET("api/payments/box-office-events/")
    suspend fun getBoxOfficeEvents(
        @Header("X-Scanner-Token") token: String
    ): Response<List<BoxOfficeEvent>>

    @POST("api/payments/box-office-sell/")
    suspend fun sellBoxOfficeTicket(
        @Header("X-Scanner-Token") token: String,
        @Body request: SellRequest
    ): Response<SellResponse>

    @GET("api/payments/box-office-raffles/")
    suspend fun getBoxOfficeRaffles(
        @Header("X-Scanner-Token") token: String
    ): Response<List<BoxOfficeRaffle>>

    @POST("api/payments/box-office-sell-raffle/")
    suspend fun sellBoxOfficeRaffleTicket(
        @Header("X-Scanner-Token") token: String,
        @Body request: SellRaffleRequest
    ): Response<SellRaffleResponse>

    // DOJO endpoints
    @GET("api/payments/box-office-dojo-student/{id}/")
    suspend fun getDojoStudentStatus(
        @retrofit2.http.Path("id") id: Int,
        @Header("X-Scanner-Token") token: String
    ): Response<DojoStudentResponse>

    @POST("api/payments/box-office-dojo-payment/{id}/")
    suspend fun registerDojoPayment(
        @retrofit2.http.Path("id") id: Int,
        @Header("X-Scanner-Token") token: String,
        @Body request: DojoPaymentRequest
    ): Response<DojoPaymentResponse>
}

object ApiClient {
    private var retrofit: Retrofit? = null

    fun getService(baseUrl: String): ApiService {
        if (retrofit == null || retrofit?.baseUrl().toString() != baseUrl) {
            val formattedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
            retrofit = Retrofit.Builder()
                .baseUrl(formattedUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!.create(ApiService::class.java)
    }
}
