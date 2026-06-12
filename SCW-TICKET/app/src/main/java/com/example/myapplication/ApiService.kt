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
    val seat_id: Int
)

data class SellResponse(
    val success: Boolean,
    val order_id: Int?,
    val item_id: Int?,
    val code: String?,
    val seat_info: String?,
    val price: String?,
    val event_title: String?,
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
