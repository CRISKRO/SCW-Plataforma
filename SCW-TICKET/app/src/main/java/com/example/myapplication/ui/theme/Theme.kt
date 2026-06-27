package com.example.myapplication.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ScwColorScheme = darkColorScheme(
    primary = SCWRed,
    secondary = SCWDarkGray,
    tertiary = SCWTextGray,
    background = SCWBlack,
    surface = SCWSurface,
    onPrimary = SCWTextWhite,
    onSecondary = SCWTextWhite,
    onTertiary = SCWTextWhite,
    onBackground = SCWTextWhite,
    onSurface = SCWTextWhite,
    surfaceVariant = SCWDarkGray,
    onSurfaceVariant = SCWTextWhite
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Always dark to match website
    dynamicColor: Boolean = false, // Disable dynamic colors to keep brand consistency
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = ScwColorScheme,
        typography = Typography,
        content = content
    )
}