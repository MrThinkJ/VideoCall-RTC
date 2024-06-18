package com.mrthinkj.videocallproject;

import lombok.extern.java.Log;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SocketHandler extends TextWebSocketHandler {
    private static final Logger LOG = LoggerFactory.getLogger(SocketHandler.class);
    private static final String INIT = "init";
    private static final String LOGOUT = "logout";
    Map<String, WebSocketSession> connectedSessions = new HashMap<>();
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        LOG.info(String.format("[%s] Connection established: %s", session.getId(), session.getId()));
        final SignalMessage message = SignalMessage.builder()
                .type(INIT)
                .sender(session.getId())
                .build();
        connectedSessions.values().forEach(webSocketSession -> {
            try {
                webSocketSession.sendMessage(new TextMessage(Utils.getString(message)));
            } catch (IOException e) {
                LOG.warn("Error when send message: "+e);
            }
        });
        connectedSessions.put(session.getId(), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        LOG.info(String.format("[%s] Handle message: %s", session.getId(), message.getPayload()));
        SignalMessage signalMessage = Utils.getObject(message.getPayload());
        String receiverId = signalMessage.getReceiver();
        WebSocketSession receiverSession = connectedSessions.get(receiverId);
        if (receiverSession != null && receiverSession.isOpen()){
            signalMessage.setSender(session.getId());
            LOG.info("Send message {} to {}", Utils.getString(signalMessage), receiverId);
            receiverSession.sendMessage(new TextMessage(Utils.getString(signalMessage)));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        LOG.info(String.format("[%s] Connection error with exception: %s", session.getId(), exception.getLocalizedMessage()));
        removeSessionAndPublish(session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        LOG.info(String.format("[%s] Connection closed with status: %s", session.getId(), status.getReason()));
        removeSessionAndPublish(session.getId());
    }

    private void removeSessionAndPublish(String sessionId){
        connectedSessions.remove(sessionId);
        SignalMessage logoutMessage = SignalMessage.builder()
                .type(LOGOUT)
                .sender(sessionId)
                .build();
        connectedSessions.values().forEach(webSocketSession -> {
            try {
                webSocketSession.sendMessage(new TextMessage(Utils.getString(logoutMessage)));
            } catch (IOException e) {
                LOG.warn("Error when send message: "+e);
            }
        });
    }
}
