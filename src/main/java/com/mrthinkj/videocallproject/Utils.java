package com.mrthinkj.videocallproject;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class Utils {
    static ObjectMapper objectMapper = new ObjectMapper();
    public static SignalMessage getObject(String message) throws JsonProcessingException {
        return objectMapper.readValue(message, SignalMessage.class);
    }

    public static String getString(SignalMessage message) throws JsonProcessingException {
        return objectMapper.writeValueAsString(message);
    }
}
