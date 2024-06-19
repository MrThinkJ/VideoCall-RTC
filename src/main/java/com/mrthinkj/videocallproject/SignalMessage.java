package com.mrthinkj.videocallproject;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SignalMessage {
    private String type;
    private String sender;
    private String receiver;
    private Object data;
}
